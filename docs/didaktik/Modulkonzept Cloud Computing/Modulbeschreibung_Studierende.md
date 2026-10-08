# Cloud Computing verstehen, prüfen und verantworten

**Stand:** 05.10.2026

Cloud Computing ist mehr als eine Liste von Diensten großer Anbieter. In diesem Modul lernst du, eine Cloud-Architektur fachlich zu erklären, praktisch zu untersuchen und ihre technischen, sicherheitsbezogenen, ökologischen und wirtschaftlichen Folgen zu vertreten. `arsnova.eu` begleitet dich dabei als interaktives Lernwerkzeug und als reale, aber kritisch zu prüfende Fallstudie.

Das Modul richtet sich ausschließlich an Bachelorstudierende der Informatik.

## Kurze Lesehilfe

- **IU Internationale Hochschule (IU)** bezeichnet die Hochschule. `DSCC0127` ist der Modulcode und `DSCC012701` der Kurscode.
- **Credit Point (CP)** bezeichnet einen Leistungspunkt.
- Eine **Unterrichtseinheit (UE)** dauert 45 Minuten. Eine **Lerneinheit (LE)** besteht aus zwei aufeinanderfolgenden UE und dauert 90 Minuten.
- **TB01–TB12** sind zwölf Stoffblöcke. **V1–V8** sind die acht Vorlesungswochen, in denen dieser Stoff stattfindet.
- **Multiple Choice (MC)** bezeichnet Aufgaben mit vorgegebenen Antworten. Der **MC-Test** ist der Übungsfragebogen am Ende eines Stoffblocks. Er wird nicht benotet.
- **Shared Responsibility** bezeichnet die geteilte Verantwortung zwischen dir beziehungsweise deinem Team und dem Cloud-Anbieter.
- **Deployment** bezeichnet das Ausrollen einer lauffähigen Fassung. **Recovery** bezeichnet die Wiederherstellung nach einem Ausfall.
- **Observability** bezeichnet das Beobachten eines Systems über Protokolle, Kennzahlen und Ablaufspuren. **Degradation** bezeichnet einen kontrollierten Betrieb mit eingeschränkter Funktion.
- **Künstliche Intelligenz (KI)** bezeichnet hier auch werkzeugnutzende Agenten. **Maschinelles Lernen (ML)** bezeichnet datenbasierte Modellverfahren.
- **Infrastructure as Code (IaC)** bedeutet, Infrastruktur reproduzierbar als Code zu beschreiben.
- **Google Cloud Platform (GCP)**, **Amazon Web Services (AWS)** und Microsoft Azure sind die drei verbindlich verglichenen Plattformen.
- **Identity and Access Management (IAM)** bedeutet Identitäts- und Berechtigungsverwaltung. **Site Reliability Engineering (SRE)** bezeichnet einen mess- und automatisierungsorientierten Ansatz für zuverlässigen Betrieb.
- **Financial Operations (FinOps)** verbindet technische Nutzung und Kostenverantwortung. **Total Cost of Ownership (TCO)** bezeichnet die Gesamtkosten über die betrachtete Nutzungsdauer.
- **Architecture Decision Record (ADR)** bezeichnet eine nachvollziehbare Architekturentscheidung. **6R** steht für die Migrationsoptionen Rehost, Replatform, Repurchase, Refactor, Retire und Retain.
- **Portable Document Format (PDF)** bezeichnet das vorgesehene Dateiformat für die formale Einreichung.

## Was dich in diesem Modul erwartet

Das Bachelor-Modul umfasst 5 CP und insgesamt 150 Stunden:

| Bestandteil    |             Umfang |
| -------------- | -----------------: |
| betreute Lehre | 36 UE = 27 Stunden |
| Selbststudium  |        123 Stunden |
| **Gesamt**     |    **150 Stunden** |

Die 36 UE verteilen sich auf acht Vorlesungswochen. Vier Wochen behandeln einen Stoffblock in drei UE, also 135 Minuten. Vier Wochen behandeln zwei Stoffblöcke und dauern sechs UE. Ob die Woche im Raum oder online stattfindet, ändert den Stoff nicht.

## Was du am Ende kannst

Nach erfolgreichem Abschluss kannst du:

1. Cloud-Fälle anhand von Merkmalen, Dienstmodellen und Bereitstellungsmodellen einordnen und Shared Responsibility erklären;
2. technische Cloud-Architekturen mit Virtualisierung, Containern, IaC, Netzwerk-, Vertrauens- und Zustandsgrenzen analysieren;
3. erklären, wann Serverless Computing sinnvoll ist und wann seine Grenzen überwiegen;
4. GCP, AWS und Microsoft Azure nach denselben Fähigkeiten, Verantwortungen, Risiken und Kosten vergleichen;
5. Daten- und ML-Angebote in der Cloud einschließlich Datenschutz, Reproduzierbarkeit und Betriebsfolgen beurteilen;
6. persistenten, flüchtigen und lokalen Zustand unterscheiden sowie Backup und Wiederherstellung bewerten;
7. Elastizität, Skalierung, Performance und Probleme verteilter Systeme mit geeigneter Evidenz untersuchen;
8. IAM, Security, Observability, SRE und Resilienz in überprüfbare Kontrollen und Messgrößen übersetzen;
9. technische Evidenz mit FinOps, Nachhaltigkeit, TCO, 6R, Alternativen und Exit zu einer ADR verbinden und diese Entscheidung fachlich verteidigen.

Die fünf offiziellen Qualifikationsrichtungen bleiben dabei sichtbar: Cloud-Grundlagen und Dienstmodelle, technologische Voraussetzungen, Serverless Computing, etablierte Plattformen sowie Datenwissenschaft und maschinelles Lernen in der Cloud.

## Aufbau jedes Themenblocks

Jeder Themenblock folgt demselben verlässlichen Aufbau:

### UE 1 und UE 2: eine zusammenhängende Lerneinheit

In den ersten 90 Minuten:

- aktivierst du Vorwissen und ältere Kernideen mit kurzen arsnova.eu-Impulsen;
- klärst du die fachliche Leitfrage des Themenblocks;
- prüfst du Quellen, Repository-Ausschnitte, Konfigurationen oder Messberichte;
- wendest du das Konzept auf die Fallstudie an;
- vergleichst du deine Begründung mit anderen;
- sicherst du einen Zwischenstand für dein Dossier und das Selbststudium.

### UE 3: MC-Test zum Üben

Die letzte UE ist in jedem Themenblock gleich aufgebaut:

| Phase                                              |       Zeit |
| -------------------------------------------------- | ---------: |
| Wechsel zum MC-Test und zugängliche Bereitstellung |  3 Minuten |
| Bearbeitung von 30 Fragen                          | 32 Minuten |
| gemeinsame Ergebnis- und Lösungsbesprechung        | 10 Minuten |

Die 32 Minuten sind nur der organisatorische Rahmen in der Veranstaltung. Es gibt keinen technischen Countdown. Laborergebnisse und Lernprodukte entstehen bereits in der 90-minütigen LE und im Selbststudium; sie werden nicht als zusätzliche vierte UE gerechnet.

## Die acht Vorlesungswochen

Zwölf Stoffblöcke werden in acht Wochen gelehrt. Zusammengehörige Fragen zu Architektur, Kapazität, Betrieb und Kosten teilen sich eine Woche. Grundlagen und Serverless bleiben eigene Wochen, weil sie zum Modul gehören, auch wenn sie kein eigenes Referatsthema sind.

| Woche  |  UE | Thema                                                            | Bisherige Blöcke |
| ------ | --: | ---------------------------------------------------------------- | ---------------- |
| **V1** |   3 | Grundlagen, Cloudmodelle und Shared Responsibility               | TB01             |
| **V2** |   6 | Container, IaC, Deployment, Härtung und Zustand                  | TB02, TB03       |
| **V3** |   3 | Serverless Computing                                             | TB04             |
| **V4** |   3 | Datenwissenschaft, maschinelles Lernen und Informationsqualität  | TB06             |
| **V5** |   6 | Storage, Recovery, Skalierung und verteilte Systeme              | TB07, TB08       |
| **V6** |   3 | IAM, Security, Observability, Degradation und Resilienz          | TB09             |
| **V7** |   6 | Plattformen, FinOps, Nachhaltigkeit und 6R                       | TB05, TB10       |
| **V8** |   6 | Architekturentscheidung, Referatswerkstatt und Probeverteidigung | TB11, TB12       |

Im [ausführlichen Themenblockplan](./Themenblockplan_Cloud_Computing_12_Themenbloecke.md) findest du zu jedem Themenblock die Leitfrage, den Ablauf der drei UE, den verbindlichen Fachwortschatz, Quellen, Lernprodukte und Selbststudiumsaufträge.

## So verteilen sich die 123 Stunden Selbststudium

| Aktivität                                        |   Stunden |
| ------------------------------------------------ | --------: |
| Vor- und Nachbereitung der acht Vorlesungswochen |      24 h |
| Pflichtlektüre und technische Vertiefung         |      30 h |
| Agentic Cloud Engineering Dossier                |      30 h |
| Plattform-, Privacy- und Wirtschaftsvergleich    |      15 h |
| Referatsrecherche, Visualisierung und Probe      |      18 h |
| individuelle Agentenkritik und Revision          |       6 h |
| **Gesamt**                                       | **123 h** |

Die Bereiche greifen ineinander. Wenn du zum Beispiel einen Nachweis zur Wiederherstellung für dein Dossier prüfst und ihn später im Referat verwendest, zählt diese Arbeit nur einmal.

## arsnova.eu: Lernwerkzeug und Studienobjekt

### Als synchrones Lernwerkzeug

Mit arsnova.eu:

- rufst du Vorwissen und frühere Inhalte ab;
- beantwortest du anspruchsvolle Verständnis-, Anwendungs- und Transferfragen;
- vergleichst du Begründungen im Gespräch mit anderen Studierenden;
- machst du typische Fehlvorstellungen sichtbar, ohne daraus eine Note abzuleiten;
- erhältst du unmittelbar eine neue Erklärung oder ein Gegenbeispiel;
- gibst du der Lehrperson Hinweise darauf, was noch einmal anders erklärt werden sollte.

### Als authentisches Studienobjekt

Du untersuchst an arsnova.eu eine wirkliche Architektur, statt nur ein vereinfachtes Lehrdiagramm zu betrachten. Dazu gehören unter anderem ein Node.js-Backend, ein Angular-Frontend, PostgreSQL, Redis, WebSockets, Yjs, Container, die Compose-Datei des Produktionsbetriebs sowie dokumentierte Last-, Backup- und Betriebsnachweise.

Du lernst dabei vier Aussagen sauber zu trennen:

- **Implementiert:** Der dokumentierte Produktionspfad ist derzeit ein Single-Host-Deployment.
- **Lokal verifiziert:** Bestimmte Beitritts-, Abstimmungs-, Wiederverbindungs-, Yjs- und Dauerlast-Szenarien wurden in einer lokalen Testumgebung ausgeführt.
- **Produktiv beobachtet:** Ein historischer Lauf belegt 500 gleichzeitige Joins, aber nicht den vollständigen Live-Betrieb.
- **Zielbild:** Eine verteilte oder horizontal skalierende Architektur kann entworfen und im Labor geprüft werden, ist damit aber noch keine Produktionseigenschaft oder Kapazitätszusage.

Genau diese Trennung ist Teil deiner fachlichen Arbeit: Was ist belegt, in welcher Umgebung wurde es beobachtet und welche Schlussfolgerung wäre zu stark?

## ARSnova-Livefragen: anspruchsvoll und spielerisch

Pro Themenblock lernst du mit zehn Livefragen. Jeder der zehn unterstützten Typen kommt einmal vor:

1. Single Choice,
2. Multiple Choice,
3. Freitext,
4. bewertbare Kurzantwort,
5. unbewertete Umfrage,
6. unbewertetes Rating,
7. numerische Schätzung,
8. Zuordnung,
9. Reihenfolge,
10. Kategorisierung.

Alle Fragen sind mittel oder schwer. Falsche Optionen sind keine Scherzantworten, sondern plausible Fehlvorstellungen. Deshalb geht es nicht nur darum, die richtige Option zu finden, sondern deine Entscheidung zu erklären.

Zur Aktivierung vergibt arsnova.eu automatisch Spitznamen aus dem Kindergarten-Thema, zeigt eine Rangliste und lost dich in eines der vier Teams `Apfel`, `Birne`, `Banane` oder `Apfelsine` ein. Dazu kommen Bonuspunkte, kurze Motivationstexte sowie Ton-, Belohnungs- und Emoji-Effekte. Der übliche Timer dauert 60 Sekunden und wird bei schwereren Fragen verlängert. Vorher hast du eine eigene Lesephase.

Die Spielelemente bleiben Spielsignale. Rang, Punkte, Geschwindigkeit, Teamstand und Boni fließen nicht in deine Note ein und werden nicht zu einem persönlichen Leistungsprofil verdichtet. Während eine bewertbare Livefrage geöffnet ist, siehst du keine Lösung oder Lösungsmarkierung.

Deine Teilnahme an den Liveantworten ist freiwillig und zählt nicht zur Note. Wenn du nicht unter Zeitdruck antworten kannst oder möchtest, bearbeitest du dieselbe Fachaufgabe ohne Zeitlimit. Eine persönlich bewilligte Zeitverlängerung hat Vorrang. Fachinformationen werden nie nur über Farbe, Bild, Animation oder Ton vermittelt.

## MC-Test: Wissen mit Abstand wieder abrufen

Der MC-Test enthält je Stoffblock genau 30 Fragen: keine leichte, 12 mittlere und 18 schwere.

Du arbeitest im Übungsmodus. Nach deiner Antwort erhältst du sofort eine fachliche Erklärung. Es gibt keinen technischen Countdown und keine öffentliche Bestenliste. Eine vollständige Dokument- oder Papierfassung ohne Zeitlimit enthält dieselben Fragen, Lösungen und Erklärungen und ist ein gleichwertiger Weg.

Der erste Durchgang findet in UE 3 statt. Denselben Fragensatz kannst du später erneut vollständig bearbeiten. Wichtige Konzepte kehren in späteren Wochen in einem neuen Zusammenhang wieder. Dafür ist kein fester zeitlicher Abstand vorgegeben.

Der MC-Test ist keine Prüfung. Punkte, Bearbeitungszeiten und einzelne Antworten entscheiden weder über die Zulassung noch über die Note. Zusammengefasste Ergebnisse der Gruppe können der Lehrperson zeigen, welches Konzept noch einmal geübt werden sollte.

## Dein Arbeitsdossier

Im Arbeitsdossier, intern Agentic Cloud Engineering Dossier genannt, sammelst du während des Semesters zum Beispiel:

- überprüfbare Agentenaufträge mit Ziel, Grenzen, Rechten und Kostenrahmen;
- Quellen, Architekturdiagramme und Zustandsmodelle;
- IaC-, Konfigurations- und Härtungsnachweise;
- Backup-, Recovery-, Security-, Performance- und Resilienzergebnisse;
- Plattform-, Privacy-, TCO-, FinOps-, Nachhaltigkeits- und 6R-Vergleiche;
- eine ADR mit einer ernsthaft geprüften Gegenalternative;
- deine persönliche Kritik an Fehlern, Annahmen und Grenzen der Agentenergebnisse.

Ein KI-Agent kann planen, Werkzeuge verwenden, Änderungen durchführen und Tests oder Messungen vorbereiten. Er übernimmt aber nicht deine Verantwortung. Du prüfst Quellen, genehmigst riskante oder kostenwirksame Schritte, kontrollierst Ergebnisse und kannst deine Entscheidung selbst erklären. Produktion, Echtdaten, Produktionszugänge und unbudgetierte Cloud-Ressourcen sind für die Lehrarbeit ausgeschlossen.

Das Dossier hilft dir beim Lernen und bei der Referatsvorbereitung. Es ist kein zusätzlicher benoteter Prüfungsbestandteil, und ein Agent darf keine Note vergeben.

## Geräte und gleichwertige Zugangswege

### Tablet oder Laptop für Live-Lernen

arsnova.eu und der MC-Test laufen im Browser. Für Livefragen, kurze Diskussionen und Wiederholungen kannst du ein Tablet oder einen Laptop verwenden.

### Laptop für tiefe technische Arbeit

Für Repository-Suche, geteilte Quellansichten, Architektur- und Konfigurationsvergleiche, IaC, Laborarbeit und umfangreichere Dossierarbeit brauchst du einen Laptop oder eine gleichwertige bereitgestellte Arbeitsumgebung.

Ein fehlendes Gerät, eine instabile Verbindung oder ein anderer Zugangsbedarf darf keinen fachlichen Nachteil erzeugen. Je nach Aufgabe stehen Partnerarbeit, strukturierte Repository-Auszüge, vorbereitete Messberichte, zugängliche Dokumentfassungen und Antwortwege ohne Zeitlimit zur Verfügung.

## Deine Prüfung

Die Prüfung ist ein Referat von insgesamt 15 Minuten je Person. In dieser Zeit liegen Vortrag, Befragung und Diskussion. Sie besteht aus drei Teilen:

| Bestandteil                                      | Gewicht |
| ------------------------------------------------ | ------: |
| schriftliche Einreichung als Handout oder Poster |    30 % |
| visuell unterstützter Vortrag                    |    30 % |
| Befragung und Diskussion                         |    40 % |

Die konkrete Prüfungsaufgabe legt fest, ob du allein oder in einer Gruppe arbeitest, ob ein Handout oder Poster verlangt wird, welches Thema gilt und welche Hilfsmittel erlaubt sind. Auch bei Gruppenarbeit bleiben Prüfungszeit, eigener Beitrag und Bewertung individuell.

Die Vorlesung folgt den acht Wochen oben. Die Prüfung folgt den sechs Referatsthemen in [CLOUD-COMPUTING-REFERAT-PRUEFUNG.md](../CLOUD-COMPUTING-REFERAT-PRUEFUNG.md), alle zum Moderationskompass von arsnova.eu. Welches Thema, welches Format und welche Hilfsmittel für dich gelten, steht in der veröffentlichten Prüfungsaufgabe.

Für eine starke Leistung brauchst du keine Produktwerbung und keinen Katalog von Cloud-Diensten. Du brauchst eine klare These, belastbare Quellen, eine nachvollziehbare technische Evidenz, eine faire Gegenalternative, sichtbare Grenzen und eine eigene begründete Entscheidung.

ARSnova-Punkte, MC-Test-Ergebnisse, Dossierfortschritt, Agentenurteile und Bearbeitungszeiten sind keine Prüfungsleistung. Ob KI-Werkzeuge für die formale Einreichung verwendet werden dürfen, richtet sich ausschließlich nach der veröffentlichten Prüfungsaufgabe beziehungsweise myCampus. Du musst deine Aussagen und Entscheidungen in jedem Fall selbst vertreten können.

## Datenschutz und Umgang mit Lerndaten

Toolergebnisse werden ausschließlich für die Lehre und die interne Qualitätssicherung des Moduls genutzt. Sie dienen nicht:

- der Forschung,
- einer Publikation,
- deiner individuellen Leistungsbewertung,
- einem personenbezogenen Leistungsprofil,
- einer späteren Nutzung zu einem anderen Zweck.

Automatische Pseudonyme verringern unnötige Klarnamennutzung. Sie sind keine Zusage vollständiger technischer Anonymität. Trage keine Zugangsdaten, Schlüssel, Token, Produktionszugänge, vertraulichen Systeminformationen oder unnötigen personenbezogenen Daten in Livefragen, Agentenaufträge oder das Dossier ein.

## Was du aus dem Modul mitnehmen sollst

Am Ende sollst du bei einer Cloud-Behauptung nicht nur fragen: »Welche Technik wurde verwendet?« Du sollst zusätzlich fragen können:

- Welche Fähigkeit und welches Verantwortungsmodell werden wirklich benötigt?
- Was ist implementiert, was wurde lokal geprüft und was wurde produktiv beobachtet?
- Welche Messung könnte die Behauptung widerlegen?
- Welche Daten, Rechte, Kosten und Umweltwirkungen entstehen?
- Welche Alternative wurde ernsthaft geprüft?
- Wo endet die Gültigkeit der Entscheidung?

Wenn du diese Fragen mit Quellen, Evidenz und einer klaren eigenen Begründung beantworten kannst, kannst du Cloud Computing nicht nur beschreiben, sondern verantwortlich gestalten.
