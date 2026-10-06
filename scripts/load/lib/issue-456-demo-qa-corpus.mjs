/**
 * Curated German questions for the Issue #456 acceptance scenario.
 *
 * The corpus intentionally contains no participant identifiers. Every participant
 * receives five questions about concrete items in the canonical demo quiz and
 * five questions about using arsnova.eu. Repetitions across a 250-person lecture
 * hall are realistic; questions are distinct within one participant's quota.
 */

export const ISSUE_456_MIN_PARTICIPANTS = 250;
export const ISSUE_456_QUESTIONS_PER_PARTICIPANT = 10;

export const ISSUE_456_DEMO_QUIZ_QUESTIONS = Object.freeze([
  'Wie kann die Stimmungsfrage zu Beginn ausgewertet werden, ohne einzelne Personen bloßzustellen?',
  'Welche Lernstrategien aus der Wortwolke eignen sich besonders für eine gemeinsame Nachbesprechung?',
  'Warum wird Pi im Demo-Quiz auf zwei Dezimalstellen gerundet und wie wird die Toleranz bewertet?',
  'An welchen Merkmalen lässt sich bei der Dachszene begründet erkennen, ob das Bild KI-generiert ist?',
  'Warum sind Vorwissen, Verständnis und Anwendung sinnvolle Anlässe für einen kurzen Live-Check?',
  'Wie lässt sich die Zahl der sichtbaren Cubies eines 3×3-Zauberwürfels systematisch herleiten?',
  'Welche Merkmale im Codebeispiel weisen auf die Creative-Coding-Umgebung Processing hin?',
  'Warum gehören zwei Abstimmungsrunden und eine Diskussion zum Konzept Peer Instruction?',
  'Weshalb gilt 1789 als Beginn der Französischen Revolution und welche Ereignisse markieren diesen Beginn?',
  'Warum folgt bei der Genexpression die RNA-Prozessierung auf die Transkription?',
  'Wie helfen die Daten im Zuordnungsspiel dabei, die Entwicklung der Weimarer Republik zu verstehen?',
  'An welchen Merkmalen lassen sich die Werke im Demo-Quiz ihren Literaturepochen zuordnen?',
  'Wie kann die abschließende Einsatzbewertung genutzt werden, um die nächste Lehrveranstaltung zu planen?',
  'Welche der zehn Fragetypen des Demo-Quiz eignen sich für eine diagnostische Einstiegsfrage?',
  'Wie unterscheiden sich Freitext, Kurztext und Wortwolke im didaktischen Einsatz des Demo-Quiz?',
  'Welche Fehlvorstellung soll die Zauberwürfel-Frage sichtbar machen und wie kann man sie auflösen?',
  'Wie lässt sich der Lernzuwachs zwischen den beiden Runden der Revolutionsfrage beurteilen?',
  'Warum ist bei der Live-Check-Frage eine Mehrfachauswahl fachlich sinnvoll?',
  'Welche Rückmeldung sollten Lernende nach einer falschen Antwort auf die Pi-Frage erhalten?',
  'Wie kann die Reihenfolge der Genexpression nach der Abstimmung gemeinsam begründet werden?',
  'Welche Gemeinsamkeit haben Zuordnung, Sortierung und Kategorisierung als Lernaktivitäten?',
  'Wie kann die Sicherheitseinschätzung helfen, richtiges Raten von sicherem Wissen zu unterscheiden?',
  'Welche Demo-Frage eignet sich am besten für eine Peer-Instruction-Diskussion und warum?',
  'Wie kann man die Wortwolke moderieren, wenn häufige und seltene Lernstrategien genannt werden?',
  'Welche Ergebnisse des Team-Quiz sollten nach der letzten Frage noch gemeinsam reflektiert werden?',
]);

export const ISSUE_456_ARSNOVA_QUESTIONS = Object.freeze([
  'Wie trete ich einer arsnova.eu-Session bei, ohne ein persönliches Konto anzulegen?',
  'Welche Informationen sehen Lehrende bei anonymen Teilnehmenden und welche bleiben verborgen?',
  'Wie unterstützt arsnova.eu Lehrende dabei, Fragen aus einem großen Hörsaal zu priorisieren?',
  'Was passiert mit meiner Frage, wenn der Q&A-Kanal ohne Vorabmoderation geöffnet ist?',
  'Wie kann ich in arsnova.eu erkennen, ob meine Q&A-Frage erfolgreich übermittelt wurde?',
  'Wie unterscheiden sich Quiz, Q&A und Blitzlicht in arsnova.eu für den Einsatz im Unterricht?',
  'Wie kann ein Tempo-Blitzlicht genutzt werden, ohne den laufenden Quizablauf zu unterbrechen?',
  'Welche Tastaturfunktionen brauche ich, um an einem Quiz barrierearm teilzunehmen?',
  'Wie werden lange Fragen und Antworttexte auf einem kleinen Smartphone dargestellt?',
  'Wie schützt arsnova.eu die Sitzung, wenn viele Teilnehmende dieselbe Campus-IP-Adresse verwenden?',
  'Warum benötigt jede teilnehmende Person eine eigene Sitzungscapability statt einer IP-basierten Freigabe?',
  'Wie können Lehrende erkennen, welche Quizfrage noch einmal erklärt werden sollte?',
  'Welche Bedeutung hat die Antwortsicherheit neben einer richtigen oder falschen Antwort?',
  'Wie bleibt die Abstimmung fair, wenn eine Verbindung kurz abbricht und anschließend wiederhergestellt wird?',
  'Welche Daten fließen in die Moderationszusammenfassung ein und wie werden die Quellen kenntlich gemacht?',
  'Wie kann die Kontextvorschau geprüft werden, bevor eine Zusammenfassung angefordert wird?',
  'Was bedeutet ein Fallback der Zusammenfassung und welche Inhalte bleiben dann weiterhin verfügbar?',
  'Wie verhindert arsnova.eu, dass Lösungshinweise während einer laufenden Frage an Teilnehmende gelangen?',
  'Wie können Lehrende Q&A-Fragen anheften, archivieren oder für die Präsentation auswählen?',
  'Wie hilft der Teammodus dabei, Austausch zu fördern, ohne individuelle Ergebnisse offenzulegen?',
  'Welche Rückmeldungen erhalten Teilnehmende, wenn ihr persönliches Fragenkontingent erreicht ist?',
  'Wie werden Ergebnisse nach einem Quiz für eine didaktische Nachbesprechung aufbereitet?',
  'Was sollten Lehrende bei der Nutzung von Bildern und Quellenangaben in einem Quiz beachten?',
  'Wie unterstützt arsnova.eu verschiedene Sprachen in derselben Lehrveranstaltung?',
  'Welche Einstellungen helfen dabei, Animationen und Töne an individuelle Bedürfnisse anzupassen?',
]);

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} muss eine positive Ganzzahl sein.`);
  }
}

/**
 * Returns the exact ten-question assignment for one participant.
 * Even slots cover the demo quiz, odd slots cover arsnova.eu.
 */
export function buildIssue456ParticipantQuestions(participantIndex) {
  if (!Number.isInteger(participantIndex) || participantIndex < 0) {
    throw new Error('participantIndex muss eine nichtnegative Ganzzahl sein.');
  }

  return Array.from({ length: ISSUE_456_QUESTIONS_PER_PARTICIPANT }, (_, questionIndex) => {
    const scope = questionIndex % 2 === 0 ? 'demo-quiz' : 'arsnova.eu';
    const bank =
      scope === 'demo-quiz' ? ISSUE_456_DEMO_QUIZ_QUESTIONS : ISSUE_456_ARSNOVA_QUESTIONS;
    const bankIndex = (participantIndex * 3 + Math.floor(questionIndex / 2) * 7) % bank.length;
    return {
      participantIndex,
      questionIndex,
      scope,
      text: bank[bankIndex],
    };
  });
}

export function buildIssue456DemoQaCorpus(
  participantCount = ISSUE_456_MIN_PARTICIPANTS,
  questionsPerParticipant = ISSUE_456_QUESTIONS_PER_PARTICIPANT,
) {
  assertPositiveInteger(participantCount, 'participantCount');
  assertPositiveInteger(questionsPerParticipant, 'questionsPerParticipant');
  if (participantCount < ISSUE_456_MIN_PARTICIPANTS) {
    throw new Error(`Issue #456 verlangt mindestens ${ISSUE_456_MIN_PARTICIPANTS} Teilnehmende.`);
  }
  if (questionsPerParticipant !== ISSUE_456_QUESTIONS_PER_PARTICIPANT) {
    throw new Error(
      `Das Q&A-Produktlimit und Issue #456 verlangen genau ${ISSUE_456_QUESTIONS_PER_PARTICIPANT} Fragen pro Person.`,
    );
  }

  return Array.from({ length: participantCount }, (_, participantIndex) =>
    buildIssue456ParticipantQuestions(participantIndex),
  ).flat();
}

export function summarizeIssue456Corpus(corpus) {
  const participantCounts = new Map();
  const scopes = new Map();
  const uniqueTexts = new Set();
  for (const item of corpus) {
    participantCounts.set(
      item.participantIndex,
      (participantCounts.get(item.participantIndex) ?? 0) + 1,
    );
    scopes.set(item.scope, (scopes.get(item.scope) ?? 0) + 1);
    uniqueTexts.add(item.text);
  }
  return {
    participants: participantCounts.size,
    questions: corpus.length,
    questionsPerParticipant: [...participantCounts.values()].sort((a, b) => a - b),
    scopes: Object.fromEntries(scopes),
    uniqueTexts: uniqueTexts.size,
  };
}
