
-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- REWARDS
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  cost INTEGER NOT NULL DEFAULT 10 CHECK (cost > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards"
  ON public.rewards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rewards"
  ON public.rewards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rewards"
  ON public.rewards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rewards"
  ON public.rewards FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REDEMPTIONS
CREATE TABLE public.redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID,
  reward_title TEXT NOT NULL,
  reward_emoji TEXT NOT NULL DEFAULT '🎁',
  cost INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemptions"
  ON public.redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own redemptions"
  ON public.redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own redemptions"
  ON public.redemptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AVATARS STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
