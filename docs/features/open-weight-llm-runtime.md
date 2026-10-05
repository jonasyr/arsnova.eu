<!-- markdownlint-disable MD013 -->

# Private Open-Weight-LLM-Runtime (Story 8.9d / Runtime R)

**Stand:** 2026-10-05

**Status:** Runtime, App-Verträge und Betriebswrapper implementiert; produktiv standardmäßig aus; noch kein fachlicher Consumer verdrahtet

**ADR:** [ADR-0035](../architecture/decisions/0035-self-hosted-llm-runtime-llama-cpp-over-ollama.md)

## Ergebnis und Grenze

Runtime R stellt eine gemeinsame, private CPU-Runtime für drei getrennte technische Aufträge bereit:

- `topic_label` für 1.14c Stufe 2,
- `qa_summary` für 8.9c Slice 4,
- `learning_objectives` für Issue #456 Slice 5.

Die versionierten Zod-Verträge liegen in `libs/shared-types/src/open-weight-llm.ts`. Der Backend-Client übersetzt ausschließlich diese Verträge nach llama.cpp Chat Completions, prüft die strukturierte Antwort erneut und verwirft unbekannte Quellen- oder Aufgabenreferenzen. Runtime R verdrahtet noch keinen Auftrag in eine Produktoberfläche. Daher entsteht durch diesen Slice allein keine neue sichtbare Funktion.

`OPEN_WEIGHT_LLM_ENABLED` bleibt standardmäßig `false` und ist unabhängig von `NLP_ENABLED`, `QA_NLP_ENABLED`, `WORD_CLOUD_SEMANTIC_ENABLED` und `QA_SUMMARY_ENABLED`. Es gibt keinen SaaS-Fallback.

## Gepinnte Artefakte

| Artefakt          | Pin                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------- |
| llama.cpp Runtime | `server-b10524@sha256:57e505f69c3a55fa5dd9c15fced47cff7a899f5b5b504ea93d75b2f401b87830`   |
| Modell            | `unsloth/Qwen3-4B-Instruct-2507-GGUF` Revision `a06e946bb6b655725eafa393f4a9745d460374c9` |
| Datei             | `Qwen3-4B-Instruct-2507-Q4_K_M.gguf`, 2.497.281.120 Byte                                  |
| GGUF SHA-256      | `3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597`                        |

Die kanonische Quelle ist `docker/open-weight-llm/model-manifest.json`. Das GGUF wird nicht in das Image kopiert und nie beim Containerstart aus dem Netz geladen. Betreiber:innen beziehen es einmalig über die dort festgehaltene, revisionsgebundene URL und prüfen es vor jedem Start:

```bash
curl --fail --location \
  --output /srv/arsnova/models/open-weight-llm/Qwen3-4B-Instruct-2507-Q4_K_M.gguf \
  https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/a06e946bb6b655725eafa393f4a9745d460374c9/Qwen3-4B-Instruct-2507-Q4_K_M.gguf
node scripts/open-weight-llm/verify-model.mjs \
  docker/open-weight-llm/model-manifest.json \
  /srv/arsnova/models/open-weight-llm/Qwen3-4B-Instruct-2507-Q4_K_M.gguf
```

## Topologien

| Einsatz               | Transport                                                 | Compose                                                                          | Grenze                                                                              |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Kanonische Produktion | Authentisiertes HTTP an eine private RFC1918-/ULA-Adresse | `docker-compose.llm.yml` auf einem zweiten privaten CPU-Host                     | Host-Firewall erlaubt Port 8080 ausschließlich vom App-Host; kein öffentliches DNAT |
| Same-Host-Labor       | Unix-Socket                                               | Profil `llm` in `docker-compose.yml` oder `docker-compose.prod.yml`              | `network_mode: none`; nicht zusammen mit spaCy und Encoder auf dem 16-GB-Live-Host  |
| macOS Host-npm        | `http://127.0.0.1:8080`                                   | eigener Container im Docker-Desktop-Hostnetz oder nativ gepinnter `llama-server` | kein Docker-Volume-Socket, kein öffentlicher Bind                                   |

Der normale `scripts/deploy.sh`-Pfad startet die Runtime absichtlich nicht.

### Zweiten privaten Host vorbereiten

1. Eigenes Runtime-Image aus `docker/open-weight-llm/Dockerfile` bauen, in die interne Registry pushen und den Registry-Digest festhalten.
2. Das geprüfte GGUF unter einem absoluten Hostpfad ablegen.
3. `.env.llm.example` nach `.env.llm` kopieren. `.env.llm` ist git-ignoriert. Image nur als `...@sha256:<digest>`, private Bind-Adresse und separates Secret mit 32–512 Zeichen aus `A–Z`, `a–z`, `0–9`, `.`, `_`, `~`, `-` setzen. Kommas sind ausgeschlossen, damit llama.cpp den Wert nicht als mehrere API-Schlüssel interpretiert.
4. Konfiguration prüfen und bewusst starten:

```bash
npm run llm:prod -- config
npm run llm:prod -- up -d
npm run llm:prod -- ps
```

Der Wrapper lehnt Tag-only-Images, öffentliche oder Loopback-Bind-Adressen, kurze Credentials, relative Modellpfade und beim Erstellen oder Starten einen falschen GGUF-Digest ab. Reine Inspektions- und Rollback-Befehle wie `ps`, `logs`, `stop` oder `down` bleiben auch bei einem fehlenden oder defekten Modell ausführbar.

Auf dem App-Host werden anschließend nur diese Werte gesetzt:

```dotenv
OPEN_WEIGHT_LLM_ENABLED=false
OPEN_WEIGHT_LLM_URL=http://10.0.0.20:8080
OPEN_WEIGHT_LLM_SOCKET_PATH=
OPEN_WEIGHT_LLM_TOKEN=<dasselbe-separate-secret>
```

URL und Socket sind gegenseitig exklusiv. Das Flag bleibt bis zur gesonderten Consumer-, Last-, Security-, Privacy- und Qualitätsfreigabe aus.

### Same-Host-Labor

```bash
OPEN_WEIGHT_LLM_MODEL_DIR=/absoluter/pfad/zum/modell \
OPEN_WEIGHT_LLM_TOKEN=<lokales-ascii-secret-mit-32-bis-512-zeichen> \
npm run docker:up:llm
```

Die App im Compose-Netz nutzt `/run/open-weight-llm/llm.sock`. Host-npm auf macOS kann diesen Docker-Volume-Socket nicht sehen und verwendet stattdessen `OPEN_WEIGHT_LLM_URL=http://127.0.0.1:8080` mit einer nur an Loopback gebundenen Runtime.

Für diesen Host-npm-Pfad muss in Docker Desktop Host Networking aktiviert sein. Danach startet das gesonderte Profil den Container ausführbar an Loopback:

```bash
OPEN_WEIGHT_LLM_MODEL_DIR=/absoluter/pfad/zum/modell \
OPEN_WEIGHT_LLM_TOKEN=<lokales-url-sicheres-secret-mit-32-bis-512-zeichen> \
npm run docker:up:llm:http
```

Das per npm gestartete Backend erhält passend dazu:

```dotenv
OPEN_WEIGHT_LLM_ENABLED=true
OPEN_WEIGHT_LLM_URL=http://127.0.0.1:8080
OPEN_WEIGHT_LLM_SOCKET_PATH=
OPEN_WEIGHT_LLM_TOKEN=<dasselbe-lokale-secret>
```

Das Profil `llm-http` ist ausschließlich ein lokaler Laborpfad. Der Produktionswrapper akzeptiert weiterhin weder Loopback noch Wildcards, sondern nur eine private RFC1918-/ULA-Adresse des zweiten Hosts.

## Laufzeitvertrag

- global höchstens ein App-Auftrag gleichzeitig über alle drei Auftragstypen;
- vor jedem Modellaufruf `GET /slots?fail_on_no_slot=1`;
- maximal ein POST nach erfolgreicher Slot-Sonde, keine App-interne Modellqueue;
- belegter Slot: Label und Summary liefern sofort ihren fachlichen Fallback, Lernzielableitung `{ status: "busy", retry: "manual" }`;
- Caller-Abbruch und auftragsspezifisches Timeout begrenzen bereits die DNS-Auflösung, brechen danach den HTTP-Aufruf ab und lösen das globale Inflight in `finally`; verspätete DNS-Ergebnisse starten keinen Request;
- Circuit Breaker öffnet nach drei Timeout-/Verfügbarkeits-/Antwortfehlern für 30 Sekunden;
- URL-Hostnamen werden aufgelöst und auf ausschließlich Loopback/RFC1918/ULA geprüft; die Anfrage wird an die geprüfte IP gepinnt;
- Telemetrie enthält nur Auftragstyp, Modellalias, Laufzeit und Tokenzahlen, keine Prompttexte.

llama.cpp b10524 dokumentiert mehrere strukturierte `response_format`-Varianten. Der reale Modelllauf zeigte, dass `type: "json_schema"` mit `schema` in diesem Build HTTP 200 liefern kann, ohne die Grammatik anzuwenden. Der Translator verwendet deshalb das ebenfalls dokumentierte und real geprüfte Format `type: "json_object"` plus `schema`. Die Zod-Validierung nach der Inferenz bleibt in jedem Fall verbindlich.

## Hartflags und Ressourcen

Der Entry-Point erzwingt unter anderem:

```text
--parallel 1 --ctx-size 4096 --n-predict 768
--no-webui --slots --api-key … --reasoning off
--n-gpu-layers 0 --slot-prompt-similarity 0 --jinja --offline
```

Containergrenzen: 4 CPU, 5 GiB RAM, 128 PIDs, read-only Root-Dateisystem, alle Linux-Capabilities entfernt und `no-new-privileges`. Der Server bindet nie automatisch an eine Wildcard.

## Realer lokaler Modellnachweis vom 2026-10-05

Messgrenze: Apple M2 Pro, 12 Kerne, 16 GB RAM; Docker-Linux `arm64`; Containerlimit 4 CPU / 5 GiB; CPU-only; Unix-Socket; lokale Runtime-Image-ID `sha256:5c686e7e06ca10ccf0126c76d2130f0c024fce9038913abf3e774f888fc54ecd` auf Basis des oben gepinnten Multiarch-Digests. Die Messung ist ein Runtime-Nachweis, keine Produktions- oder Qualitätsabnahme der drei Consumer.

Auftrag: deutsches Kurzlabel aus zwei Quellen, strikt strukturierte Ausgabe. Ergebnis:

```json
{
  "schemaVersion": 1,
  "taskType": "topic_label",
  "label": "Kryptographie",
  "sourceIds": ["s1", "s2"]
}
```

| Messwert                             |                                                     Kaltlauf |
| ------------------------------------ | -----------------------------------------------------------: |
| Prompttokens                         |                                                          153 |
| Ausgabetokens                        |                                                           29 |
| Prefill                              |                                      2.327 ms; 65,74 Token/s |
| Generierung                          |                                      1.328 ms; 21,08 Token/s |
| TTFT, aus Server-Timings angenähert  | ca. 2.375 ms (`prompt_ms` plus Zeit für erstes Ausgabetoken) |
| Ende-zu-Ende                         |                                                     3.722 ms |
| maximal beobachteter cgroup-Speicher |                                                    2,945 GiB |
| maximal beobachtete CPU              |                                                        394 % |

Ein Warm-Lauf mit 148 gecachten Prompttokens dauerte 1.120 ms. Die Messung belegt Schemaerzwingung und Ausführbarkeit des kurzen Labelauftrags. Sie belegt nicht Summary-Prefill auf der echten 8-vCPU-Inferenzbox, Lernzielqualität, p95 unter Last, Produktions-RSS oder fachliche Freigabe. Diese Nachweise bleiben vor Aktivierung beziehungsweise in den jeweiligen Consumer-Slices offen.

## Verifikation

```bash
npm run test:open-weight-llm:all
npm test -w @arsnova/shared-types -- src/open-weight-llm.test.ts
npm test -w @arsnova/backend -- --run \
  src/lib/openWeightLlmConfig.test.ts \
  src/lib/openWeightLlmClient.test.ts \
  src/__tests__/wordCloud.hotpath-isolation.test.ts
npm run typecheck
npm run build:prod
```

## Rollback

1. Auf dem App-Host `OPEN_WEIGHT_LLM_ENABLED=false` setzen und nur die App neu starten.
2. Auf dem Inferenzhost `npm run llm:prod -- stop open-weight-llm` ausführen.
3. Consumer-Fallbacks bleiben maßgeblich; keine Session-, Quiz- oder Lernzieldaten müssen migriert werden.
