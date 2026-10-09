# Referatsthemen im Modul Cloud Computing

## Ausgangslage der Fallstudie arsnova.eu

arsnova.eu ist in diesem Kurs unsere gemeinsame Fallstudie, weil daran eine typische Cloud-Computing-Entscheidung aus der beruflichen Praxis sichtbar wird.

Die Ausgangslage ist ein reales, produktiv betriebenes Audience-Response-System. Derzeit ist arsnova.eu auf eine Größenordnung von etwa **500 gleichzeitigen Nutzerinnen und Nutzern in einer Session** ausgelegt. Die Stakeholder formulieren nun eine deutlich höhere Zielgröße: Das System soll entweder **eine einzelne sehr große Veranstaltung mit 5.000 gleichzeitigen Nutzerinnen und Nutzern** tragen oder alternativ **100 parallele Sessions mit jeweils 50 Nutzerinnen und Nutzern** zuverlässig bedienen.

Damit entsteht eine klassische Entscheidungssituation für Product Owner, Architektinnen, Entwickler, DevOps-Teams und Betreiber: Reicht die bestehende Architektur aus? Muss anders skaliert werden? Ist Cloud Computing dafür notwendig oder nur eine teure Ausweichlösung? Falls Cloud sinnvoll ist: Welche Variante ist technisch tragfähig, sicher betreibbar und wirtschaftlich vertretbar?

Die zentrale Frage lautet also nicht abstrakt: „Was ist Cloud Computing?“ Sondern konkret:

**Welche Cloud- oder Nicht-Cloud-Architektur ermöglicht arsnova.eu, von 500 auf 5.000 gleichzeitige Nutzerinnen und Nutzer beziehungsweise auf 100 parallele Sessions zu wachsen, ohne Verfügbarkeit, Datenschutz, Betriebssicherheit und Kostenkontrolle zu verlieren?**

Diese Frage ist für die Informatik besonders relevant, weil zukünftige Berufsfelder selten nur aus Implementierungsaufgaben bestehen. Informatikerinnen und Informatiker müssen technische Systeme beurteilen, Skalierungsgrenzen erkennen, Kostenmodelle verstehen, Sicherheits- und Datenschutzfolgen einordnen und tragfähige Architekturentscheidungen begründen. Genau darum geht es in dieser Fallstudie.

arsnova.eu dient dabei als realer Untersuchungsgegenstand. Die sechs Referatsthemen betrachten dieselbe Ausgangslage aus unterschiedlichen Cloud-Computing-Perspektiven: Architektur und Entkopplung, Daten- und KI-Dienste, Skalierung und Last, Betrieb und Resilienz, Sicherheit und Lieferkette sowie Kosten und Plattformwahl.

Am Ende soll nicht nur klar sein, welche Cloud-Technologien es gibt. Entscheidend ist, ob ihr begründen könnt, **wann Cloud Computing für ein reales System notwendig, sinnvoll, überdimensioniert oder wirtschaftlich nicht vertretbar ist**.

## Einsatz von KI-Agenten

Der Einsatz aktueller KI-Agenten ist in diesem Kurs nicht nur erlaubt, sondern ausdrücklich erwünscht. Cloud Computing, Skalierung, Security, Betrieb, Kostenbewertung und Architekturentscheidungen werden in der beruflichen Praxis zunehmend mit KI-gestützten Werkzeugen vorbereitet, geprüft, simuliert, dokumentiert und implementiert. Der Kurs bildet diese Realität bewusst ab.

Das bedeutet: Ihr müsst für eure Untersuchung nicht jede Zeile Code selbst schreiben. KI-Agenten dürfen bei Recherche, Architekturvergleich, Testentwurf, Implementierung, Skripten, Messauswertung, Diagrammen, Handout, Folien und sprachlicher Überarbeitung eingesetzt werden. Auch vollständig KI-generierte Entwürfe sind zulässig, sofern sie fachlich geprüft, transparent gemacht und von euch verantwortet werden.

Die Eigenleistung verschiebt sich dadurch nicht weg vom Fachlichen, sondern hin zu einer zeitgemäßen informatischen Kompetenz: gute Fragen stellen, Anforderungen präzisieren, Agentenergebnisse prüfen, Fehler erkennen, Evidenz einfordern, Quellen bewerten, technische Entscheidungen begründen und die Grenzen der eigenen Lösung offenlegen.

KI-Nutzung ersetzt also keine Kompetenz. Sie macht Kompetenz sichtbarer.

Für die Referatsprüfung gilt deshalb streng:

1. Verwendete KI-Agenten, Modelle, zentrale Prompts, wesentliche KI-Beiträge und übernommene Ergebnisse werden transparent dokumentiert.
2. Technische Aussagen, Messwerte, Kosten, Sicherheitsbehauptungen, Literaturangaben und Architekturentscheidungen müssen durch Primärquellen, Repository-Belege oder reproduzierbare Tests überprüft werden.
3. Halluzinierte Quellen, ungeprüfte Preisangaben, erfundene Benchmarks oder nicht nachvollziehbare Systembehauptungen gelten als schwerwiegende Mängel.
4. Personenbezogene Daten, Secrets, Zugangsdaten, vertrauliche Systeminformationen und nicht freigegebene Produktionsdaten dürfen nicht an KI-Agenten weitergegeben werden.
5. Ihr bleibt für Inhalt, Auswahl, Bewertung und Darstellung vollständig verantwortlich.

Im Vortrag und in der Diskussion muss deutlich werden, dass ihr euer Thema wirklich durchdrungen habt. Ihr müsst erklären können, warum ihr bestimmte KI-Werkzeuge eingesetzt habt, welche Ergebnisse brauchbar waren, welche verworfen oder korrigiert wurden, welche Annahmen offenbleiben und wie eure abschließende Entscheidung fachlich zustande kommt.

Ein gutes Referat zeigt daher nicht: „Die KI hat eine Lösung erzeugt.“

Ein gutes Referat zeigt: „Ich habe mit KI-Agenten gearbeitet, ihre Ergebnisse kritisch geprüft, eigene Evidenz aufgebaut und daraus eine begründete Cloud-Computing-Entscheidung abgeleitet.“

Gerade das ist eine zentrale Kompetenz zukünftiger Berufsfelder in der Informatik: nicht KI-frei zu arbeiten, sondern KI-gestützte Arbeit fachlich, ethisch, transparent und verantwortbar zu beherrschen.

## Die sechs Referatsthemen als Cloud-Computing-Fallstudien

Die Referate untersuchen arsnova.eu als konkrete Cloud-Computing-Fallstudie. Es geht nicht darum, ein Produktfeature isoliert zu erklären. Ihr prüft an einem realen System zentrale Fragen des Cloud Computing: Wo laufen Dienste? Wie werden Ressourcen getrennt? Wie skaliert ein System? Wie bleibt es sicher, beobachtbar, bezahlbar und betreibbar?

Wählt das Thema, bei dem euch die technische Perspektive am meisten interessiert.

## Thema 1: KI-Inferenz für den Moderationskompass: Systemgrenzen und entkoppelte Architektur

Dieses Thema behandelt Cloud Computing aus der Perspektive der Architektur verteilter Dienste.

Ihr untersucht, warum eine Cloud-Anwendung nicht alle Aufgaben im selben Prozess oder auf demselben Server erledigen sollte. Der Moderationskompass braucht schnelle Live-Funktionen, aber KI-Inferenz kann langsam, speicherintensiv oder fehleranfällig sein. Genau daraus entsteht eine klassische Cloud-Frage: Welche Komponenten gehören auf den App-Host, welche in einen getrennten Dienst, und wie werden sie über Schnittstellen, Queues, Timeouts und Fallbacks entkoppelt?

Der Cloud-Bezug liegt in Dienstgrenzen, Deployment-Topologie, Containerisierung, Netzwerkkommunikation, Ressourcenisolation und asynchroner Verarbeitung.

Dieses Thema passt zu euch, wenn ihr euch für Softwarearchitektur, verteilte Systeme, Container, Schnittstellen, Nebenläufigkeit und Deployment interessiert. Ihr schaut nicht nur auf ein Architekturdiagramm, sondern prüft, ob die Trennung im Betrieb wirklich funktioniert: Was passiert bei hoher Latenz? Was passiert, wenn der Inferenzdienst nicht erreichbar ist? Bleiben Live-Aktionen wie Join, Vote oder Q&A weiterhin schnell?

Am Ende sollt ihr begründet entscheiden können, ob die Architekturgrenzen sinnvoll gesetzt sind oder ob bestimmte Timeouts, Ressourcenlimits oder Entkopplungen verbessert werden sollten.

## Thema 2: Wie viel KI braucht der Moderationskompass? Informationsqualität und begrenzter Kontext

Dieses Thema behandelt Cloud Computing aus der Perspektive daten- und KI-gestützter Cloud-Dienste.

Ihr untersucht, wann regelbasierte Verfahren reichen und wann ML- oder LLM-Funktionen einen echten Mehrwert liefern. In Cloud-Systemen ist KI nicht automatisch besser: Modellaufrufe kosten Zeit, Speicher, Energie und Geld. Außerdem ist der Modellkontext begrenzt. Deshalb müsst ihr prüfen, welche Daten in den Kontext gehören, welche Informationen weggelassen werden, wie Quellenbindung gesichert wird und ob die KI-Ausgabe wirklich hilfreicher ist als eine einfachere Lösung.

Der Cloud-Bezug liegt in Data/ML-Services, Kontextbudget, Inferenzkosten, Datenflüssen, Qualitätssicherung und der Entscheidung zwischen einfacher Logik, klassischer NLP-Auswertung und generativer KI.

Dieses Thema passt zu euch, wenn ihr euch für NLP, Machine Learning, Informationsqualität, Evaluation und Prompt-/Kontextdesign interessiert. Ihr vergleicht verschiedene Stufen: einfache Regeln, nichtgenerative Kategorien und Themen sowie eine private generative Kurzfassung. Dabei prüft ihr, ob die Ausgabe quellentreu ist, ob wichtige Anliegen sichtbar bleiben, ob Bewertungen korrekt interpretiert werden und wie stark Tokenbudget und Kontextauswahl die Qualität beeinflussen.

Am Ende sollt ihr begründet entscheiden können, wann die optionale KI-Unterstützung ihren Aufwand rechtfertigt und wann der regelbasierte oder extraktive Pfad die bessere Wahl ist.

## Thema 3: Begrenzte Inferenzkapazität: Zulassung, Last und Skalierung

Dieses Thema behandelt Cloud Computing aus der Perspektive von Skalierung und Kapazitätsmanagement.

Ihr untersucht, was passiert, wenn mehrere Analysewünsche auf eine begrenzte Inferenzressource treffen. In Cloud-Systemen ist Skalierung nie nur „mehr Server“, sondern eine Architekturentscheidung: Welche Last entsteht wirklich? Welche Jobs dürfen parallel laufen? Was wird abgewiesen? Was wird gecacht? Wann ist ein Ergebnis zu alt? Wann braucht man mehr Kapazität?

Der Cloud-Bezug liegt in Lastmodellen, Backpressure, Queues, Caching, horizontaler Skalierung, Fairness zwischen Sessions und der Unterscheidung zwischen Live-Verfügbarkeit und KI-Verfügbarkeit.

Dieses Thema passt zu euch, wenn ihr euch für Lasttests, Skalierung, Backpressure, Queues, Fairness, Caching und Performance Engineering interessiert. Ihr betrachtet nicht einfach die Anzahl der Teilnehmenden, sondern die tatsächliche Inferenzlast: Wie oft fordern Hosts Analysen an? Wie groß ist der Kontext? Wie lange dauert ein Job? Was passiert, wenn viele Veranstaltungen gleichzeitig eine Zusammenfassung wollen?

Am Ende sollt ihr begründet entscheiden können, bis zu welcher Nutzung die aktuelle Konfiguration tragfähig ist, wann Fallbacks oder Retry-Regeln ausreichen und ab wann eine neue Kapazitätsentscheidung nötig wird.

## Thema 4: Verlässlicher Moderationskompass: Degradation, Beobachtbarkeit und Modelllebenszyklus

Dieses Thema behandelt Cloud Computing aus der Perspektive von Cloud-Betrieb, SRE und Resilienz.

Ihr untersucht, wie ein Cloud-System reagiert, wenn optionale Dienste ausfallen, langsam werden oder falsche Ergebnisse liefern. Ein gutes Cloud-System darf nicht nur im Normalfall funktionieren. Es muss Fehler erkennen, verständlich anzeigen, auf sichere Fallbacks zurückgreifen und kontrolliert wieder in den Normalbetrieb wechseln. Außerdem müssen Modell-, Prompt- oder Schemaänderungen versioniert, beobachtet und bei Bedarf zurückgerollt werden.

Der Cloud-Bezug liegt in Observability, SLOs, Fault-Injection, Degradation, Rollout/Rollback, Recovery und zuverlässigem Betrieb verteilter Systeme.

Dieses Thema passt zu euch, wenn ihr euch für SRE, Observability, Fault-Injection, Monitoring, Rollout/Rollback und robuste Betriebsprozesse interessiert. Ihr prüft nicht nur, ob ein Dienst „antwortet“, sondern ob die Antwort fachlich brauchbar, aktuell und zulässig ist. Dazu untersucht ihr Fallbacks, Telemetrie, Fehlerzustände, Wiederanlauf und kontrollierte Änderungen am Modell- oder Kontextpfad.

Am Ende sollt ihr begründet entscheiden können, welche Betriebszustände sichtbar gemacht werden müssen, welche Fallbacks sinnvoll sind und unter welchen Bedingungen eine Änderung freigegeben oder zurückgerollt werden sollte.

## Thema 5: Privater Moderationskompass: Daten-, Modell- und Lieferkettensicherheit

Dieses Thema behandelt Cloud Computing aus der Perspektive von Security, Privacy und Supply Chain.

Ihr untersucht, wie sensible Daten, Modellaufrufe und Softwareartefakte in einer Cloud-Architektur geschützt werden. Private Inferenz bedeutet nicht automatisch Sicherheit. Entscheidend ist, wer welche Daten sehen darf, welche Informationen in den Modellkontext gelangen, wie Prompt Injection behandelt wird, ob Quellen erneut geprüft werden und ob Container, Modelle und Konfigurationen nachvollziehbar aus vertrauenswürdigen Artefakten stammen.

Der Cloud-Bezug liegt in IAM, Trust Boundaries, Datenminimierung, Netzgrenzen, Secret-Schutz, Prompt-Injection-Abwehr, Container-Härtung, Modellprovenienz und Lieferkettensicherheit.

Dieses Thema passt zu euch, wenn ihr euch für Security, Datenschutztechnik, Prompt Injection, Zugriffskontrolle, Supply Chain Security, Container-Härtung und sichere Deployments interessiert. Ihr betrachtet den kompletten Pfad: Wer darf Kontext erzeugen? Welche Daten werden entfernt oder aggregiert? Was passiert, wenn eine Quelle gelöscht oder gesperrt wird? Wie robust ist das System gegen eingeschleuste Anweisungen in Fragen oder Lernzielen? Sind Modell, Runtime und Container nachvollziehbar versioniert?

Am Ende sollt ihr begründet entscheiden können, welche Schutzmaßnahmen wirksam sind, welche Restrisiken bleiben und welche Härtungen für den Betrieb notwendig oder sinnvoll wären.

## Thema 6: Cloud-Betriebsmodell für den Moderationskompass: CPU, GPU oder Managed AI?

Dieses Thema behandelt Cloud Computing aus der Perspektive von Plattformwahl, Kosten und Verantwortungsmodell.

Ihr untersucht, ob private CPU-Inferenz für den Moderationskompass ausreicht oder ob GPU-Inferenz beziehungsweise Managed-AI-Dienste sinnvoller wären. Dabei geht es nicht nur um Geschwindigkeit. Eine Cloud-Entscheidung muss Leistung, Qualität, Kosten, Datenschutz, Betriebsaufwand, Region, Anbieterbindung und Exit-Möglichkeiten zusammen betrachten.

Der Cloud-Bezug liegt in IaaS, PaaS, Managed AI, CPU- und GPU-Ressourcen, FinOps, TCO, Shared Responsibility, Providervergleich, Lock-in und Architekturentscheidungen.

Dieses Thema passt zu euch, wenn ihr euch für Cloud-Provider, FinOps, Kostenmodelle, Performancevergleiche, Betriebsverantwortung und Architekturentscheidungen interessiert. Ihr vergleicht CPU, GPU und Managed AI nicht abstrakt, sondern anhand derselben nutzbaren Moderationsleistung: Wie lange dauert eine brauchbare Zusammenfassung? Was kostet ein erfolgreicher Job? Welche Rolle spielen Leerlauf, Startzeiten, Tokenpreise, Betriebspersonal, Datenschutz, Region, Lock-in und Exit?

Am Ende sollt ihr begründet entscheiden können, ob der private CPU-Betrieb für das untersuchte Nutzungsprofil tragfähig ist oder unter welchen Bedingungen eine GPU- oder Managed-AI-Alternative neu bewertet werden müsste.

## Entscheidungshilfe

Die sechs Referatsthemen sind keine sechs Produktbeschreibungen zu arsnova.eu. Sie sind sechs Cloud-Computing-Perspektiven auf dasselbe reale System:

| Thema | Cloud-Computing-Kern                                 |
| ----- | ---------------------------------------------------- |
| 1     | Architektur, Dienstgrenzen, Entkopplung              |
| 2     | Data/ML in der Cloud, Kontext und Inferenzqualität   |
| 3     | Skalierung, Kapazität, Last und Caching              |
| 4     | Betrieb, Observability, Resilienz und Rollback       |
| 5     | Security, Privacy, IAM und Supply Chain              |
| 6     | Plattformwahl, Kosten, CPU/GPU/Managed AI und FinOps |

Wenn euch Architektur und saubere Systemgrenzen interessieren, wählt Thema 1.

Wenn euch KI-Qualität, NLP, Kontextauswahl und Evaluation interessieren, wählt Thema 2.

Wenn euch Performance, Last, Skalierung und Fairness interessieren, wählt Thema 3.

Wenn euch Betrieb, Fehlerfälle, Monitoring und Rollback interessieren, wählt Thema 4.

Wenn euch Security, Datenschutztechnik, Prompt Injection und Supply Chain interessieren, wählt Thema 5.

Wenn euch Kosten, Cloud-Angebote, CPU/GPU/Managed AI und Betriebsentscheidungen interessieren, wählt Thema 6.

Wichtig ist bei allen Themen: Ihr sollt nicht nur beschreiben, sondern prüfen, messen, vergleichen und am Ende eine begründete technische Entscheidung treffen.

Ihr entscheidet euch also nicht nur für ein arsnova-Thema, sondern für eine fachliche Cloud-Perspektive auf eine reale Skalierungs- und Betriebsentscheidung.
