-- Session retention deletes several thousand dependent rows per lecture-hall
-- batch. PostgreSQL's referential-action triggers query the referencing side
-- once per deleted parent row; without a leading index this degenerates into
-- repeated full-table scans and can exceed Prisma's interactive transaction
-- timeout. Build the indexes concurrently because migrations run while the
-- previous production app writer is still online.
--
-- A cancelled concurrent build leaves a same-named invalid index behind.
-- Drop each possible remainder before rebuilding it so a Prisma migration
-- retry cannot silently keep an unusable index. PostgreSQL rejects
-- DROP INDEX CONCURRENTLY in Prisma's migration transaction; on a fresh
-- deployment these statements are no-ops, while a failed-build retry may wait
-- briefly for the required table lock.

DROP INDEX IF EXISTS "AnswerOption_questionId_idx";
CREATE INDEX CONCURRENTLY "AnswerOption_questionId_idx"
  ON "AnswerOption"("questionId");

DROP INDEX IF EXISTS "Participant_teamId_idx";
CREATE INDEX CONCURRENTLY "Participant_teamId_idx"
  ON "Participant"("teamId");

DROP INDEX IF EXISTS "HostCredentialExchange_sourceCredentialId_idx";
CREATE INDEX CONCURRENTLY "HostCredentialExchange_sourceCredentialId_idx"
  ON "HostCredentialExchange"("sourceCredentialId");

DROP INDEX IF EXISTS "ParticipantJoinReplay_participantId_idx";
CREATE INDEX CONCURRENTLY "ParticipantJoinReplay_participantId_idx"
  ON "ParticipantJoinReplay"("participantId");

DROP INDEX IF EXISTS "Vote_questionId_idx";
CREATE INDEX CONCURRENTLY "Vote_questionId_idx"
  ON "Vote"("questionId");

DROP INDEX IF EXISTS "VoteAnswer_answerOptionId_idx";
CREATE INDEX CONCURRENTLY "VoteAnswer_answerOptionId_idx"
  ON "VoteAnswer"("answerOptionId");

DROP INDEX IF EXISTS "BonusToken_participantId_idx";
CREATE INDEX CONCURRENTLY "BonusToken_participantId_idx"
  ON "BonusToken"("participantId");

DROP INDEX IF EXISTS "BonusToken_sessionId_idx";
CREATE INDEX CONCURRENTLY "BonusToken_sessionId_idx"
  ON "BonusToken"("sessionId");

DROP INDEX IF EXISTS "SessionFeedback_participantId_idx";
CREATE INDEX CONCURRENTLY "SessionFeedback_participantId_idx"
  ON "SessionFeedback"("participantId");

DROP INDEX IF EXISTS "QaQuestion_participantId_idx";
CREATE INDEX CONCURRENTLY "QaQuestion_participantId_idx"
  ON "QaQuestion"("participantId");

DROP INDEX IF EXISTS "QaUpvote_participantId_idx";
CREATE INDEX CONCURRENTLY "QaUpvote_participantId_idx"
  ON "QaUpvote"("participantId");

DROP INDEX IF EXISTS "AdminAuditLog_sessionId_idx";
CREATE INDEX CONCURRENTLY "AdminAuditLog_sessionId_idx"
  ON "AdminAuditLog"("sessionId");
