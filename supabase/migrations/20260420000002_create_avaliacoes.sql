-- Mission 4: Create avaliacoes (ratings) table
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id   uuid        REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id  uuid        NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_id        uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  nota             smallint    NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario       text,
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- Indexes for fast look-ups
CREATE INDEX IF NOT EXISTS idx_avaliacoes_professional ON public.avaliacoes (professional_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_client       ON public.avaliacoes (client_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_appointment  ON public.avaliacoes (appointment_id);

-- Row-level security
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver avaliações"
  ON public.avaliacoes FOR SELECT USING (true);

CREATE POLICY "Clientes autenticados podem criar avaliações"
  ON public.avaliacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autor pode excluir sua própria avaliação"
  ON public.avaliacoes FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE email = auth.email()
    )
  );
