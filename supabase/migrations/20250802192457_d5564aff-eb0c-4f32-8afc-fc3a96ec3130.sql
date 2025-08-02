-- Create policy to allow viewing names for auction display
CREATE POLICY "Users can view names for auctions" ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);