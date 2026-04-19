-- Allow everyone (including anonymous visitors) to read the locations table.
-- The app shows an interactive map as the public home page, so we need read
-- access without authentication. Visits remain user-scoped.

DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;

CREATE POLICY "Locations are viewable by everyone"
  ON public.locations FOR SELECT
  TO anon, authenticated
  USING (true);
