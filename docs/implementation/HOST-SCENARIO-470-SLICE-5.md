# Abschlussprüfung der Host-Führung — #470, Slice 5

Quelle: [Issue #470](https://github.com/kqc-real/arsnova.eu/issues/470), ausschließlich Slice 5. Ausgangspunkt ist der saubere Branch `codex/470-slice-4`, Commit `e7d94ac229ab3e460d399dd4f4745331b3455117`. Gearbeitet wird auf `codex/470-slice-5`. Die Prüfung umfasst den gesamten Stand seit `4916d816`, einschließlich aller vier vorherigen Slices. Issue und aktuelle Kommentare sowie die einschlägigen Verträge aus #412/#417/#410/#411/#438 wurden abgeglichen. Kein Push, PR oder Schließen des Issues ist Bestandteil dieses Auftrags.

## Änderungen und Nachweise

Die [Host-Führung mit vollständiger Abnahmematrix](../ui/HOST-FUEHRUNG.md) ordnet alle 18 Zeilen der Szenario-/Zustandsmatrix sowie die Pflichtszenarien A–G und die Accessibility-Anforderungen konkreten Implementierungen, Unit-/Komponententests und Browserpfaden zu. Vorhandener Prüfcode und tatsächlich ausgeführte Nachweise werden getrennt ausgewiesen. Funktionsübersicht, Styleguide und Testanleitung verlinken diesen Vertrag.

- **Echte Home-Einstiege:** Das neue `smoke:host-home-entry` klickt alle vier vorhandenen Blitzlicht-Chips in sechs Sprach-/Presetfällen. Dazu kommen der Q&A-Pulldown-Lifecycle mit Abbruch, Löschfehler, Erfolg und 3→2-Übergang, EVENT-Beides mit Erfolg, Teil-Erfolg/Retry und Abbruch in beiden vorhandenen Schritten sowie CLASSROOM über Quizimport/-auswahl, Wiederaufnahme des letzten eigenen Quiz und den gesamten Durchlauf. Die Sessions entstehen durch UI-Aktionen. API-Zugriffe lesen den Serverzustand, erzeugen Teilnahmen für den Identitätsnachweis und die Quiz-Gesamtauswertung und beenden die eigens erzeugten Sessions.
- **Beides und Wiederaufnahme:** Genau eine Session, unveränderte Teilnahmeidentität nach Formatwechsel, bestätigte Tabs und `preferredChannel`, Reload im selben Tab, neutraler neuer Tab sowie bestehender Q&A-Zugang nach widersprechender globaler Aufgabenwahl. Bei einem neuen Q&A-Einstieg übernimmt der Server die INITIAL-Defaults bereits beim Anlegen. Die zwei Schritte sind Teilnahmeprofil und Host-Zugangskarte; es gibt keinen zusätzlichen Q&A-Konfigurationsdialog. Dessen bestehende Regeln gelten separat für noch unkonfigurierte hinzugefügte Q&A-Kanäle und Einstellungen.
- **Quizabschluss:** Bei weiter nutzbaren Nebenformaten steht jetzt »Quiz beendet« statt »Session beendet«. Der bestehende `liveChannelsRemainAfterQuiz()`-Zustand entscheidet; `hostEnded` hat Vorrang. Vier DOM-Fälle prüfen Q&A, Blitzlicht, beide und geschlossene Nebenformate einschließlich Wechsel auf globales Ende. Dasselbe fokussierbare Überschriftenelement bleibt erhalten.
- **Rückkehr aus dem Home-Profildialog:** Die beiden Q&A-Startbuttons bleiben während Pending fokussierbar (`disabledInteractive`). Dadurch kann Material nach Abbruch zum tatsächlichen Auslöser zurückkehren, statt den Fokus an die Codeeingabe zu verlieren. Der vorhandene `hostSessionStarting`-Guard verhindert weiterhin doppelte Dialoge und Sessionstarts. Zwei DOM-Regressionen prüfen Pending, Fokusfähigkeit, Doppelklicksperre und Abbruch.
- **Zielgröße im Störungshinweis:** Der allgemeine 320-Pixel-Test fand den Home-seitig sichtbaren Button »Mehr erfahren« mit nur 15 Pixeln Höhe. Eine lokale Mindesthöhe von 1,5 rem hebt ihn auf die geforderten 24 Pixel, ohne Farben oder Navigation zu ändern. Der vorhandene Layouttest bleibt unverändert.
- **QR-Dialogrückkehr:** Nach dem Schließen wartet die Fokusrückgabe auf den Abbau der CDK-Fokusfalle. Dadurch überschreibt deren Rückgabe nicht mehr den QR-Auslöser, insbesondere nach automatisch geöffnetem Join-Dialog und abgebrochener Zugangskarte. Session- und analoger Legacy-Feedback-Pfad sind gemeinsam korrigiert und mit DOM-Regressionen versehen.
- **Exportfokus:** Der Varianten-Auslöser bleibt während des Exports fokussierbar und kündigt Pending mit `aria-busy` an. Der Menütrigger ist in dieser Zeit abgekoppelt, sodass weder Tastatur noch Klick einen konkurrierenden Export starten. Komponententest und Home-Browserpfad prüfen tatsächliche Menübedienung, Rückkehrfokus, Ablehnung und Retry.
- **Zugänglicher Sessioncode:** Die elementbezogene Bewertung von axe-`aria-prohibited-attr` fand `aria-label` auf Absätzen. Das ist gemäß [WAI-ARIA 1.2, paragraph](https://www.w3.org/TR/wai-aria-1.2/#paragraph) nicht zulässig. Alle vier analogen Anzeigen im Session- und Feedback-Host verwenden nun das vorhandene lokalisierte Label als `.sr-only`-Text und blenden die visuelle Kopie für assistive Technik aus. Die sichtbare Gestaltung bleibt erhalten; vorhandene DOM-Tests sichern beide Varianten einschließlich Join-Overlay ab.
- **Stabiler Testaufbau:** Der Q&A-Workspace-Test und die vier neuen Abschluss-Titelfälle warten auf das tatsächliche Promise von `ngOnInit()` statt auf pauschal 50 ms. Damit überschreiben verspätete Initialabfragen nicht die bereits gesetzten Filter-Testdaten. Bestehende Pending-, Filter- und Fokusassertions bleiben erhalten.
- **Confidence-Demosmoke:** Die Abschlussüberschrift folgt dem Quizende. Der Test verwendet jetzt den bestehenden Join-Idempotenzschlüssel und Teilnahme-Capabilities für Votes/Abschlussfeedback. Seine veralteten Fragenpositionen wurden mit dem aktuellen Demo-JSON abgeglichen (MC/Würfel an Position 4/5, weiterhin zwei bewusst erzeugte Fehlkonzept-Signale). Ein optionaler eigener History-Scope verhindert Konflikte mit einer bereits laufenden Demo-Session; keine bestehende Session wird dafür beendet. UI-/CSV-Assertions verwenden die aktuellen Labels, den tatsächlichen Markdown-Text und die Überschriftenebene 4. Ein UI-/CSV-Fehler liefert nun auch einen Fehlercode statt nur einer Warnung.
- **i18n:** Konsistente Pulse-Check-Begriffe in den englischen, spanischen und italienischen Status-/Fehlertexten; spanische und italienische Exportstatus-Texte vervollständigt. Neues Abschlusslabel in allen fünf Katalogen. Veraltete Platzhalter-Metadaten von `sessionTabs.questionsBadgeReview` an den tatsächlichen sitzungsweiten Pending-Zähler angeglichen. Keine pauschale Neuübersetzung unbeteiligter Inhalte.

## Erhaltene Verträge

Keine Änderungen an Backend, Prisma, tRPC oder Shared-Zod; keine neuen Aufgabenfelder auf dem Server. Aufgaben bleiben optionale lokale Präferenzen. `channels`, `preferredChannel`, Fristen und Berechtigungen stammen weiter vom Server. Keine Migration, Löschung bestehender Sessions oder Änderung von Host-Capabilities, Quiz-Sammlungen, Effective-Vote-Regeln, fachlichen Defaults, Teilnahme- oder Present-Payloads.

`showChannelNavigation` und `showChannelTabs` bleiben unabhängig, `#host-live-content` und Scrollziele erhalten. Ein geschlossener Kanal bleibt aktiviert. Keine zusätzlichen Presenter-, Musik- oder Stopp-Trigger. Standalone-Blitzlicht bleibt Legacy bis Story 8.10. Die Korrektur der Codeanzeige betrifft lediglich deren zugänglichen Text, keinen neuen Legacy-Einstieg.

Die [getrennten Endeaktionen](../ui/HOST-FUEHRUNG.md#quizabschluss-fragenwand-schließen-home-und-sessionende) sind ausdrücklich dokumentiert: Quizabschluss erhält offene Nebenformate; Fragenwand schließen ist eine Kanalaktion; laufendes Verlassen mit offenem Q&A versucht zusätzlich Blitzlicht zu schließen, blockiert aber bei dessen Fehler die Navigation nicht. Home aus `FINISHED` verwendet seinen bisherigen eigenen Abschluss-/Presenter-Dismiss. Globales Sessionende benötigt die bestehende Bestätigung.

**Offene Produktabweichung:** Der pauschale Issue-Wortlaut »Session beenden immer erreichbar« passt nicht vollständig zum erhaltenen Lifecycle: Bei offenem Q&A ersetzt »Zur Startseite« die globale Endeaktion. Während einer laufenden Session muss Q&A zunächst geschlossen werden. Slice 5 ändert diese fachliche Semantik nicht und erklärt diesen Punkt nicht als vollständig abgenommen.

## Validierung

Für Tests, Build, Browser und reguläre Commit-Hooks:

```bash
export PATH=/Users/kqc/.nvm/versions/node/v24.18.0/bin:$PATH
export NODE_OPTIONS=--max-old-space-size=2048
export VITEST_MAX_WORKERS=1
export NG_BUILD_MAX_WORKERS=1
```

Nach einem vom Nutzer gemeldeten RAM-Engpass wurden die ursprünglichen 4-GB-/Zwei-Build-Worker-Einstellungen auf 2 GB Node-Heap und einen Build-Worker reduziert. Frontend-Vitest verwendet weiterhin `forks` mit einem Worker. Ein lokaler Prozesswächter überwacht Folgeprüfungen und beendet sie bei 5 GiB Aufgaben-RSS oder 13 GiB gesamtem Prozess-RSS; die Reserve berücksichtigt App und Betriebssystem. Dies ist eine sekündliche RSS-Überwachung, keine harte macOS-Speicherquote. Die ressourcenintensiven Prüfungen werden nacheinander ausgeführt. Ein während der Arbeit vorhandener fremder Entwicklungsserver auf 3000/3001/3002 bleibt erhalten. Die eigene Node-24-Backendinstanz verwendet 3100/3101/3102, die lokalisierte Vorschau den freien Proxyport 4200. PostgreSQL/Redis bleiben unangetastet. Keine `.env`-Inhalte, Host-Tokens, Zugangskarten oder sonstigen operativen Artefakte werden eingecheckt.

### Ausführungsprotokoll

Die folgenden Ergebnisse stammen aus Slice 5. Prüfungen vor den abschließenden Korrekturen werden nicht als Abschlussnachweis übernommen.

| Prüfung                                                                                             | Ergebnis                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                 | Bestanden.                                                                                                                                                                                                                    |
| `npm test`                                                                                          | **4.002 bestanden**: 123 Shared-Types, 82 Exportbibliothek, 1.468 Backend, 2.329 Frontend. 37 Backend-Integrationstests wegen nicht gesetzter Opt-in-Schalter übersprungen; keine Backend-/Datenbankänderung in diesem Slice. |
| `npm run lint`                                                                                      | Bestanden, einschließlich Skript-Lint.                                                                                                                                                                                        |
| `npm run build:prod`                                                                                | Bestanden nach allen Produktionsänderungen: fünf Locales, 40 Prerender-Seiten, MOTD-Assets und Serviceworker-Nachverarbeitung. Bekannte Bundlewarnung: 1,95 MB bei 1,70 MB Warnschwelle (+251,81 kB).                         |
| `npm run extract-i18n -w @arsnova/frontend -- --output-path /private/tmp/arsnova-slice5/i18n-final` | Bestanden; bestehende Duplicate-ID-Hinweise.                                                                                                                                                                                  |
| Extraktions-/Katalogvergleich: IDs, normalisierte Quellen und Platzhalterattribute                  | Alle 3.563 IDs in allen fünf Katalogen stimmen mit der frischen Extraktion überein.                                                                                                                                           |
| `npm run check:i18n -w @arsnova/frontend`                                                           | Bestanden: 3.563 Einträge je Katalog.                                                                                                                                                                                         |
| `xmllint --noout apps/frontend/src/locale/messages*.xlf`                                            | Bestanden.                                                                                                                                                                                                                    |
| Gezielte Host-/Feedback-Specs (Befehl unten)                                                        | 453 bestanden, einschließlich beider QR-Fokusfallen-Rückgaben.                                                                                                                                                                |
| `npm run test -w @arsnova/frontend -- src/app/features/home/home.component.spec.ts`                 | 157 bestanden, einschließlich beider fokussierbarer Pending-Auslöser.                                                                                                                                                         |
| `npm run smoke:host-home-entry -w @arsnova/frontend`                                                | 30 echte Home-Abläufe bestanden; 24 Chipstarts, ein Q&A-Menü-Lifecycle, vier EVENT-Fälle und ein CLASSROOM-Durchlauf mit Exportablehnung/Retry. 15 axe-Zustände ohne Violations.                                              |
| `npm run smoke:unified-session -w @arsnova/frontend`                                                | Bestanden: gemeinsame Session, Kanalwechsel, Presenter und Q&A nach Host-Verlassen.                                                                                                                                           |
| `npm run smoke:epic-405-host-qa-lifecycle -w @arsnova/frontend`                                     | Bestanden: Einrichtung, geschlossener Kanal, Reload und Host-Recovery.                                                                                                                                                        |
| `npm run smoke:host-phase-controls -w @arsnova/frontend`                                            | Sechs Fälle in fünf Sprachen bestanden; Phasen, Reflow, Tastaturfokus und Exportmenü.                                                                                                                                         |
| `npm run smoke:host-qa-feedback-tools -w @arsnova/frontend`                                         | Sechs Fälle, 50 Layoutzustände, 16 axe-Zustände bestanden; keine Violations oder Allowlist-Erweiterungen. Inklusive Frist, Reconnect, Identitätssperre, Fehler/Retry.                                                         |
| `npm run smoke:epic-405-participant-qa -w @arsnova/frontend`                                        | Bestanden.                                                                                                                                                                                                                    |
| `npm run smoke:host-music -w @arsnova/frontend`                                                     | Bestanden.                                                                                                                                                                                                                    |
| `npm run smoke:session-question-progress -w @arsnova/frontend`                                      | Bestanden.                                                                                                                                                                                                                    |
| `npm run smoke:host-present-auth -w @arsnova/frontend`                                              | Bestanden.                                                                                                                                                                                                                    |
| `DEMO_QUIZ_HISTORY_SCOPE_ID=<neue UUID> npm run e2e:confidence-summary-demo -w @arsnova/frontend`   | Bestanden mit `status: OK`, `hostUiStatus: ok`: 30 Teilnahmen, 13 Fragen, 270 effektive Selbsteinschätzungen; Historie, Host-Abschlussansicht und echter CSV-Download.                                                        |
| `npm run a11y:layout -w @arsnova/frontend`                                                          | Bestanden: 49 Zustände plus Desktop-Join und Footer-Breakpoints, einschließlich des korrigierten Störungshinweis-Buttons.                                                                                                     |
| `npm run a11y:axe:static -w @arsnova/frontend`                                                      | 13 Zustände bestanden, keine Violations oder Allowlist-Erweiterungen.                                                                                                                                                         |
| `npx prettier --check` (geänderte Dateien) und `git diff --check`                                   | Bestanden.                                                                                                                                                                                                                    |
| Reguläre Commit-Hooks                                                                               | Unveränderte Hooks mit `lint-staged`, Typecheck und Gesamttests; tatsächliches Ergebnis und Commit-ID stehen im abschließenden Übergabebericht.                                                                               |

Browserkommandos liefen mit `BASE_URL=http://localhost:4200/de` und `TRPC_URL=http://localhost:3100/trpc`; die beiden allgemeinen A11y-Skripte mit `BASE_URL=http://localhost:4200`. Die lokale Vorschau leitete HTTP, WebSocket und Yjs an dieselbe eigene Backendinstanz weiter.

```bash
npm run test -w @arsnova/frontend -- \
  src/app/features/session/session-host/session-host.component.spec.ts \
  src/app/features/feedback/feedback-host.component.spec.ts
npx prettier --check \
  apps/frontend/scripts/check-host-home-entry-flow.mjs \
  apps/frontend/src/app/features/session/session-host/session-host.component.spec.ts \
  docs/ui/HOST-FUEHRUNG.md \
  docs/implementation/HOST-SCENARIO-470-SLICE-5.md \
  docs/TESTING.md docs/APP-FUNKTIONSUEBERSICHT.md docs/ui/STYLEGUIDE.md
xmllint --noout apps/frontend/src/locale/messages*.xlf
git diff --check
```

Die ersten neuen Smokes enthielten falsche Testannahmen, die anhand der Implementierung und echter Browserzustände korrigiert wurden: `quickFeedback.create` ist mit Sessioncode der reguläre sessiongebundene Rundenpfad; beim Home-Q&A-Start folgt auf das Profil unmittelbar die Zugangskarte; nach Beides ist Blitzlicht zunächst aktiviert, aber ohne gestartete Runde. Keine zusätzlichen Dialoge oder Backend-Semantik wurden eingeführt. Die erste lokale Vorschau auf 4173 verwendete den Standard-WebSocket-Port; für die abschließenden Läufe ist 4200 als tatsächlicher Proxy auf dieselbe eigene Backendinstanz vorgesehen. Diese Zwischenläufe ersetzen keine finale Reconnect-Abnahme.

Nach dem begrenzten Hosttest stieg die Summe des Prozess-RSS außerhalb der Prüfprozesse über die 13-GiB-Sicherheitsschwelle. Der Wächter lehnte weitere Teststarts vor der Prozesserzeugung ab. Fremde Anwendungen wurden nicht beendet. Nach Freigabe von Speicher durch den Nutzer sank die gesamte Prozess-RSS auf 8,62 GiB; die seriellen Prüfungen wurden unter unveränderten Schutzgrenzen fortgesetzt.

Ein Werkzeug-Smoke blieb nach erfolgreicher Blitzlicht-Aktivierung auf dem Q&A-Tab stehen; ein unveränderter Wiederholungslauf reproduzierte den Tabwechsel-Aussetzer nicht. Im Wiederholungslauf erfasste axe jedoch die gerade wechselnde Disabled-Darstellung zweier Navigationsbuttons. Der Layout-Scan wartet jetzt auf nicht beschäftigte Navigation, zwei Renderframes und das Ende endlicher Animationen. Assertions, Kontrastgrenzen und Allowlists bleiben unverändert. Der einmalige Tabwechsel-Aussetzer bleibt als nicht reproduzierte Timing-Beobachtung ein Restrisiko.

Die überwachten Abschlussläufe blieben unter der 13-GiB-Gesamtschwelle. Beispielsweise: Host-/Feedback-Specs 3,16 GiB Aufgaben-RSS / 12,17 GiB gesamt; Browser-/Gesamttestserie 2,68 / 10,68 GiB; Lint/i18n 2,62 / 10,27 GiB. Dies sind gemessene RSS-Spitzen, keine Zusage einer systemweiten harten 15-GB-Grenze.

### Screenshots und Accessibility

Die Browserartefakte entstehen unter `/private/tmp/arsnova-slice5/browser/`; sie sind lokale Prüfhilfen und keine dauerhafte Voraussetzung. Die reproduzierbaren Skripte sowie die dokumentierten Beobachtungen bleiben im Repository. Zugangskarten werden nicht fotografiert. HOME ergänzt Startseite und direkte Blitzlicht-Einstiege; PHASE ergänzt Lobby, ACTIVE, DISCUSSION und FINISHED; TOOLS ergänzt explizit die Q&A-Pending-Ansicht.

Visuell gesichtete Beispiele (Dateinamen relativ zum Artefaktverzeichnis):

| Screenshot                                                         | Stichprobe / Beobachtung                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `home/en-serious-320-home-cards.png`                               | Englische Home-Karten, 320 CSS-Pixel, seriös/hell; Labels umbrechen, vier Chips sichtbar.                    |
| `home/classroom-export-error.png`                                  | Deutscher Exportfehler, Desktop/dunkel; fokussierter Callout mit Retry und getrenntem Quizabschluss.         |
| `smoke-host-phase-controls/de-playful-320-light-active.png`        | Aktive Quizphase, mobil/spielerisch/hell; dominante Ergebnisaktion und weiteres Menü.                        |
| `smoke-host-phase-controls/de-serious-1440-dark-lobby.png`         | Lobby, Desktop/seriös/dunkel; Startaktion und Anzeige/Ton getrennt erkennbar.                                |
| `smoke-host-qa-feedback-tools/de-serious-1440-dark-qa-pending.png` | Q&A-Warteschlange, Desktop/dunkel; drei offene Prüfungen und eingeklappte Werkzeuge.                         |
| `home/it-spielerisch-840-feedback.png`                             | Italienisches laufendes Blitzlicht, spielerisch/hell; Stoppen, Rundeneinstellungen und Sessionende sichtbar. |

Die Sichtprüfung bestätigt diese abgebildeten Zustände, keine vollständige Kontrast-, Fokus- oder Screenreader-Abnahme.

320 CSS-Pixel, echte Browservergrößerung, axe und Screenreader sind unterschiedliche Nachweise. Die automatisierten Stichproben decken nicht das kartesische Produkt aller Sprachen, Phasen, Presets, Themes und Bewegungspräferenzen ab. Ein gesetztes `reducedMotion: 'reduce'` allein belegt keine vollständige Bewegungsprüfung.

Die Code-/DOM-Bewertung von `aria-valid-attr-value` am Join-Trigger bestätigt ein bedingt beim Öffnen erzeugtes Dialogziel. Die Kombination aus `aria-controls` und `aria-haspopup` wird von axe zur manuellen Prüfung ausgegeben; daraus folgt hier kein nachgewiesener Funktionsfehler. Die vorhandenen Öffnen-/Schließen-/Fokuspfade bleiben erhalten. Das ist eine begrenzte Semantikbewertung und kein Nachweis tatsächlicher Screenreader-Ausgabe.

Weitere `incomplete`-Fundstellen sind die fokussierbaren Pinned-/Archiviert-Zähler (`span` mit zugänglichem Label) sowie Tempo-Trendtexte über Verläufen und reine Symbolinhalte. DOM-Tests prüfen Labels und Tastaturerreichbarkeit der Zähler; das ersetzt keine Prüfung ihrer tatsächlichen Ansage. Diese Fälle werden nicht pauschal freigegeben.

### Verbleibende manuelle Abnahme

- VoiceOver/NVDA: Es stand keine nutzbare native assistive Prüfsitzung zur Verfügung (Computer-Use-Berechtigung fehlt; NVDA benötigt zusätzlich Windows). Hörbare Namen, Zustands-/Fehleransagen, Filterentfernung, Dialogrückkehr und Remote-Updates bleiben manuell offen.
- Safari mit beiden relevanten macOS-Tastaturnavigationseinstellungen war ohne native Bedienberechtigung nicht prüfbar und bleibt separat offen. Ein Chromium- oder WebKit-Smoke ersetzt diese Kombination nicht.
- Echter 400%-Browserzoom wurde über das native Computer-Use-Werkzeug versucht. Es meldete **»Computer Use permissions are not granted«**; damit war keine native Browserbedienung möglich. Dieser Nachweis bleibt offen und wird nicht durch 320-CSS-Pixel-Reflow ersetzt.
- axe-`incomplete` erfordert elementbezogene Bewertung; insbesondere Kontrast über Verläufen und tatsächliche Screenreader-Ausgabe sind nicht automatisch bestanden.
- Die oben beschriebene Ende-Ausnahme bleibt ein offener Abgleich mit dem Issue. Eine vollständige szenarioübergreifende Abnahme von #470 wird nicht behauptet.

## Betrieb, Rücknahme und Abschluss

Normaler Frontend-Deploymentpfad, keine neue Konfiguration oder Migration. Rücknahme durch den vorherigen Frontend-Build. Backend-Last, Shared-NAT-Ratenlimits, WebSocket-/Yjs-Protokolle, Auth und PDF-Format bleiben unverändert; zusätzliche Last-, Migrations- und PDF/UA-Zertifizierungsprüfungen sind daher nicht Bestandteil dieses Slices. Die vorhandenen Exportbibliothek-Tests bleiben Bestandteil des Gesamtlaufs.

Die regulären Hooks bleiben unverändert: `npx lint-staged`, `npm run typecheck`, `npm test`. Commit-ID, tatsächliches Hook-Ergebnis und abschließender Git-Zustand werden im Abschlussbericht übergeben. Kein Push und kein PR.
