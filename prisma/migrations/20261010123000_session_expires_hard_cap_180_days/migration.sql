-- Hartes Sessionende von 30 auf 180 Tage ab createdAt lockern.
-- Bestehende Zeilen erfüllen die engere Prüfung und bleiben unverändert.
-- Der 14-tägige Host-Nachspann hängt nicht an dieser Constraint.

ALTER TABLE "Session" DROP CONSTRAINT "Session_expires_within_hard_cap";

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_expires_within_hard_cap"
    CHECK ("expiresAt" <= "createdAt" + INTERVAL '180 days');
