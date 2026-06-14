
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

INSERT INTO public.stickers (id, emoji, name, mission_id, sort_order) VALUES
  ('special_invite_handshake', '🤝', 'Handshake', 'special_invite', 900),
  ('special_invite_glow_star', '🌟', 'Glowing star', 'special_invite', 901),
  ('special_invite_dizzy_star', '💫', 'Dizzy star', 'special_invite', 902)
ON CONFLICT (id) DO NOTHING;
