# Netzwerkplan: arsnova.eu

**Stand:** 2026-10-09

Ein Produktionshost. Nginx beendet TLS und verteilt auf einen App-Container.
PostgreSQL hält den dauerhaften Stand, Redis den flüchtigen. Live-Signale
bleiben im Speicher dieses einen Node-Prozesses.

Abgleich: `docker-compose.prod.yml`, `docs/deployment-debian-root-server.md`,
`docs/operations/MULTI-INSTANCE-PLAN.md`, `apps/frontend/src/app/core/trpc.client.ts`,
`apps/frontend/ngsw-config.json`.

## 1. Weg vom Browser zu den Diensten

```mermaid
flowchart TB
  subgraph browser [Browser]
    vote[Vote-Client]
    host[Host und Present]
    sw[PWA-Service-Worker]
    idb[(IndexedDB und Yjs)]
  end

  subgraph edge [Produktionshost]
    nginx[Nginx TLS 443]
  end

  subgraph app [Ein App-Container]
    http[Express und tRPC HTTP 3000]
    ws[tRPC-WebSocket 3001]
    yjs[Yjs-Relay 3002]
    signal[EventEmitter im Prozess]
  end

  pg[(PostgreSQL)]
  redis[(Redis)]
  pdf[PDF-Worker Unix-Socket]

  vote --> nginx
  host --> nginx
  host --- idb
  sw -.->|nur App-Hülle und statische Dateien| nginx

  nginx -->|Pfad /| http
  nginx -->|Pfad /trpc-ws| ws
  nginx -->|Pfad /yjs-ws| yjs

  http --> pg
  http --> redis
  http --> pdf
  http -->|Schreiben weckt| signal
  signal -->|weckt offene Subscriptions| ws
  ws -->|liest den neuen Stand| pg
  ws -->|Blitzlicht| redis
  yjs --> redis
```

Die Ports 3000, 3001 und 3002 sind nur an `127.0.0.1` gebunden. Von außen ist
nur Nginx erreichbar. Der Service Worker läuft nur im Produktionsbuild und
liefert keine Sitzungsdaten. IndexedDB hält die lokale Quiz-Sammlung, nicht die
Live-Stimmen.

## 2. Lesen, Schreiben, Zuschauen

```mermaid
sequenceDiagram
  participant Browser
  participant Nginx
  participant HTTP as HTTP :3000
  participant WS as WebSocket :3001
  participant PG as PostgreSQL
  participant Redis

  Browser->>Nginx: Query oder Mutation
  Nginx->>HTTP: HTTP-Batch
  HTTP->>PG: dauerhaften Stand lesen oder schreiben
  HTTP->>Redis: Blitzlicht, Anwesenheit oder Bremse
  HTTP-->>Browser: genau eine Antwort

  Note over HTTP,WS: Ein Schreiben erhöht die Revision und weckt den EventEmitter

  Browser->>Nginx: Subscription
  Nginx->>WS: eine Verbindung, mehrere Kanäle
  WS->>PG: Sitzung oder Fragen lesen
  WS->>Redis: Blitzlicht lesen
  WS-->>Browser: Nachricht nur bei geändertem Stand
  WS->>WS: auf Signal warten, sonst Timeout
```

Queries und Mutations enden nach einer Antwort. Eine Subscription bleibt offen.
`session.onStatusChanged` und `qa.onQuestionsUpdated` warten auf den
prozesslokalen EventEmitter und lesen danach PostgreSQL neu. Der Timeout beträgt
10 oder 30 Sekunden für den Status und 15 Sekunden für Fragen.
`quickFeedback.onResults` hat kein Signal. Sie liest Redis alle 0,5 Sekunden bei
offener Runde und alle 1,2 Sekunden bei Sperre oder Diskussion.

Fällt die Subscription aus, startet der Vote-Client den HTTP-Fallback alle
2 Sekunden. Im gesunden Betrieb läuft dieser Takt nicht. Der Presence-Heartbeat
bleibt davon unabhängig: ein HTTP-Aufruf alle 60 Sekunden.

## 3. Wo der Stand liegt

```mermaid
flowchart LR
  write[Schreiben per HTTP] --> revision[Revision in PostgreSQL]
  revision --> emitter[EventEmitter im Prozess]
  emitter --> sub[Status- und Fragen-Subscription]
  sub --> pool[Pool von höchstens 40 Verbindungen]
  pool --> pg[(PostgreSQL)]

  qf[Blitzlicht-Subscription] --> redis[(Redis)]
  presence[Anwesenheit und Bremsen] --> redis
  pair[Host-Pairing] --> pubsub[Redis Pub/Sub]
```

Die Revision ist der Merkzettel. Das Schreiben erhöht sie in PostgreSQL, das
Zuschauen vergleicht sie. Redis-Pub/Sub weckt heute das Host-Pairing und die
Sitzungsbereinigung, nicht den Status- oder Fragenkanal. Ein zweiter
App-Prozess würde diese Signale nicht hören.

Der PDF-Worker hängt per Unix-Socket am HTTP-Prozess und liegt außerhalb der
Live-Kanäle. Die Landing-Seite liegt nicht auf diesem Host.
