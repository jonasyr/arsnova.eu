-- SC/MC/Umfrage: Teilnehmende können die Editor-Reihenfolge sehen.
-- Antwortoptionen bekommen eine stabile Autorenreihenfolge.

ALTER TABLE "Question"
ADD COLUMN IF NOT EXISTS "shuffleAnswerOptions" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "AnswerOption"
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY "questionId" ORDER BY ctid) - 1)::integer AS ord
  FROM "AnswerOption"
)
UPDATE "AnswerOption" AS answer
SET "order" = ranked.ord
FROM ranked
WHERE answer.id = ranked.id
  AND answer."order" = 0;
