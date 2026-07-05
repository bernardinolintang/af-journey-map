-- Extend outlet_extras with optional visit detail fields
ALTER TABLE public.outlet_extras
  ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS crowd_level TEXT CHECK (crowd_level IS NULL OR crowd_level IN ('Low', 'Medium', 'High')),
  ADD COLUMN IF NOT EXISTS equipment_quality TEXT CHECK (equipment_quality IS NULL OR equipment_quality IN ('Poor', 'Okay', 'Good', 'Great')),
  ADD COLUMN IF NOT EXISTS cleanliness TEXT CHECK (cleanliness IS NULL OR cleanliness IN ('Poor', 'Okay', 'Good', 'Great'));
