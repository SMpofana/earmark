-- 0010_charitysa_seed_pipeline.sql
-- Child 1: schema changes to support charitysa-scraped organisations + claim flow.
-- Forward-only. Run with: psql $DATABASE_URL -f drizzle/0010_charitysa_seed_pipeline.sql
-- (or `npm run db:migrate` once a live DB is configured).

-- Scraped orgs have no street address, postal code, contact email, or phone
-- (charitysa detail pages only expose town + categories + website).
-- Drop NOT NULL so the scraper can insert rows with nulls.
ALTER TABLE organisations ALTER COLUMN street_address DROP NOT NULL;
ALTER TABLE organisations ALTER COLUMN postal_code DROP NOT NULL;
ALTER TABLE organisations ALTER COLUMN contact_email DROP NOT NULL;
ALTER TABLE organisations ALTER COLUMN contact_phone DROP NOT NULL;

-- Source tracking: was this org seeded by the scraper or created manually?
CREATE TYPE organisation_source AS ENUM ('manual', 'charitysa_scraped');

ALTER TABLE organisations ADD COLUMN source organisation_source NOT NULL DEFAULT 'manual';
ALTER TABLE organisations ADD COLUMN source_external_id text;
ALTER TABLE organisations ADD COLUMN claimed_at timestamp;
ALTER TABLE organisations ADD COLUMN claimed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL;

-- One row per external source (idempotency for re-runs of the scraper).
CREATE UNIQUE INDEX organisations_source_external_id_idx
  ON organisations (source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE INDEX organisations_source_idx ON organisations (source);

-- Org claim requests (admin-mediated; charitysa doesn't expose emails so
-- we can't do auto email-match).
CREATE TABLE organisation_claims (
  id text PRIMARY KEY,
  organisation_id text NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  claimer_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  claimer_email text NOT NULL,
  claimer_role_at_org text NOT NULL,
  proof_url text,
  proof_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX organisation_claims_status_idx ON organisation_claims (status);
CREATE INDEX organisation_claims_org_idx ON organisation_claims (organisation_id);

-- System user that owns all scraped organisation rows. Synthetic: no inbox,
-- never mailed. The email column is a plain unique string; we use a non-`@`
-- placeholder so it cannot be mistaken for a real deliverable address.
INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
VALUES ('system', 'Earmark System', 'system.earmark.placeholder', true, 'super_admin', now(), now())
ON CONFLICT (id) DO NOTHING;