-- Hartes Sessionende von 30 auf 180 Tage ab createdAt lockern.
-- Ganze Tage sind Kalendertage in der Sessionzeitzone. Über die Zeitumstellung
-- im Herbst liegt dieser Zeitpunkt bis zu eine Stunde nach 180×24h; die starre
-- Frist bleibt zusätzlich gültig. Bestehende Zeilen erfüllen die engere Prüfung.
-- Der 14-tägige Host-Nachspann hängt nicht an dieser Constraint.

ALTER TABLE "Session" DROP CONSTRAINT "Session_expires_within_hard_cap";

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_expires_within_hard_cap"
    CHECK (
      "expiresAt" <= GREATEST(
        "createdAt" + INTERVAL '180 days',
        (
          (
            (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE "timeZone")
            + INTERVAL '180 days'
          ) AT TIME ZONE "timeZone"
        ) AT TIME ZONE 'UTC'
      )
    );
