-- Remove the restrictive policy that only allows users to see their own bids
DROP POLICY "Users can view their own bids" ON public.bids;

-- Create new policy allowing everyone to view all bids
CREATE POLICY "Anyone can view all bids" ON public.bids
FOR SELECT
USING (true);