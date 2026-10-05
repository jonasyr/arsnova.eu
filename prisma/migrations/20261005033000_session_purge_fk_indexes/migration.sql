-- Session retention deletes several thousand dependent rows per lecture-hall
-- batch. PostgreSQL's referential-action triggers query the referencing side
-- once per deleted parent row; without a leading index this degenerates into
-- repeated full-table scans and can exceed Prisma's interactive transaction
-- timeout. Build the indexes concurrently because migrations run while the
-- previous production app writer is still online.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AnswerOption_questionId_idx"
  ON "AnswerOption"("questionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Participant_teamId_idx"
  ON "Participant"("teamId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "HostCredentialExchange_sourceCredentialId_idx"
  ON "HostCredentialExchange"("sourceCredentialId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ParticipantJoinReplay_participantId_idx"
  ON "ParticipantJoinReplay"("participantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Vote_questionId_idx"
  ON "Vote"("questionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "VoteAnswer_answerOptionId_idx"
  ON "VoteAnswer"("answerOptionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BonusToken_participantId_idx"
  ON "BonusToken"("participantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BonusToken_sessionId_idx"
  ON "BonusToken"("sessionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionFeedback_participantId_idx"
  ON "SessionFeedback"("participantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "QaQuestion_participantId_idx"
  ON "QaQuestion"("participantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "QaUpvote_participantId_idx"
  ON "QaUpvote"("participantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AdminAuditLog_sessionId_idx"
  ON "AdminAuditLog"("sessionId");
