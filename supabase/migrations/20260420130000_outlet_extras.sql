CREATE TABLE public.outlet_extras (
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID    NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_favourite BOOLEAN NOT NULL DEFAULT false,
  note        TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, location_id)
);

ALTER TABLE public.outlet_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extras"
  ON public.outlet_extras FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extras"
  ON public.outlet_extras FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extras"
  ON public.outlet_extras FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extras"
  ON public.outlet_extras FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_outlet_extras_user_id ON public.outlet_extras(user_id);
