-- Add stable source metadata for safe AF Singapore location syncing.
-- These columns let sync jobs update existing rows in place instead of
-- deleting/reinserting locations, preserving visits and outlet extras.

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS af_source_id TEXT,
  ADD COLUMN IF NOT EXISTS af_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

UPDATE public.locations
SET
  status = COALESCE(status, 'Open'),
  is_active = COALESCE(is_active, true)
WHERE country = 'SG';

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_af_source_id
  ON public.locations (af_source_id)
  WHERE af_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_country_active
  ON public.locations (country, is_active);
