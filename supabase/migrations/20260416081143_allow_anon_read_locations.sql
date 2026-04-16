-- Allow unauthenticated (anon) users to read locations
-- so the map is publicly visible without login

DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;

CREATE POLICY "Locations are viewable by everyone"
  ON public.locations FOR SELECT
  TO anon, authenticated
  USING (true);
