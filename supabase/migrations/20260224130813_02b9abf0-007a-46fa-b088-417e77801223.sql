-- Allow clients (authenticated users) to view establishments for selection
CREATE POLICY "Clients can view establishments"
ON public.establishments
FOR SELECT
USING (auth.role() = 'authenticated');
