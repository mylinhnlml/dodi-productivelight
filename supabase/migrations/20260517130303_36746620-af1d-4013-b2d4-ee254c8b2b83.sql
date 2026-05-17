
-- stickers catalog
CREATE TABLE public.stickers (
  id TEXT PRIMARY KEY,
  emoji TEXT NOT NULL,
  name TEXT NOT NULL,
  mission_id TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stickers viewable by everyone"
  ON public.stickers FOR SELECT USING (true);

-- user-owned unlocked stickers
CREATE TABLE public.user_unlocked_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sticker_id TEXT NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sticker_id)
);
ALTER TABLE public.user_unlocked_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own unlocked stickers"
  ON public.user_unlocked_stickers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Insert own unlocked stickers"
  ON public.user_unlocked_stickers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_uus_user ON public.user_unlocked_stickers(user_id);

-- seed sticker catalog
INSERT INTO public.stickers (id, emoji, name, mission_id, sort_order) VALUES
  -- starter pack (mission_id = NULL)
  ('s_sakura','🌸','sakura',NULL,1),
  ('s_leaf','🌿','leaf',NULL,2),
  ('s_seedling','🌱','seedling',NULL,3),
  ('s_star','⭐','star',NULL,4),
  ('s_bell','🔔','bell',NULL,5),
  ('s_books','📚','books',NULL,6),
  ('s_paws','🐾','paws',NULL,7),
  ('s_yoga','🧘','yoga',NULL,8),
  ('s_gym','💪','gym',NULL,9),
  ('s_phone','📞','phone',NULL,10),
  ('s_lips','💋','lips',NULL,11),
  ('s_drink','🍹','drink',NULL,12),
  ('s_plant','🪴','plant',NULL,13),
  ('s_basket','🧺','basket',NULL,14),
  ('s_bath','🛁','bath',NULL,15),
  ('s_facial','🧖','facial',NULL,16),
  ('s_brain','🧠','brain',NULL,17),
  ('s_sparkle','✨','sparkle',NULL,18),
  ('s_tulip','🌷','tulip',NULL,19),
  ('s_sun','☀️','sun',NULL,20),

  -- First step → journey_first_reminder
  ('s_sunflower','🌻','sunflower','journey_first_reminder',100),
  ('s_daisy','🌼','daisy','journey_first_reminder',101),
  ('s_clover','🍀','clover','journey_first_reminder',102),

  -- Getting started → journey_5_reminders
  ('s_salad','🥗','salad','journey_5_reminders',110),
  ('s_carrot','🥕','carrot','journey_5_reminders',111),
  ('s_corn','🌽','corn','journey_5_reminders',112),
  ('s_berry','🍓','berry','journey_5_reminders',113),

  -- 3-day streak → journey_streak_3
  ('s_fire','🔥','fire','journey_streak_3',120),
  ('s_lightning','⚡','lightning','journey_streak_3',121),
  ('s_dizzy','💫','dizzy','journey_streak_3',122),
  ('s_moon','🌙','moon','journey_streak_3',123),

  -- 7-day warrior → journey_streak_7
  ('s_trophy','🏆','trophy','journey_streak_7',130),
  ('s_medal1','🥇','medal','journey_streak_7',131),
  ('s_crown','👑','crown','journey_streak_7',132),
  ('s_diamond','💎','diamond','journey_streak_7',133),

  -- First check-off → daily_first_complete
  ('s_music','🎵','music','daily_first_complete',140),
  ('s_notes','🎶','notes','daily_first_complete',141),
  ('s_guitar','🎸','guitar','daily_first_complete',142),
  ('s_piano','🎹','piano','daily_first_complete',143),

  -- 100% club → daily_perfect
  ('s_rainbow','🌈','rainbow','daily_perfect',150),
  ('s_party','🎉','party','daily_perfect',151),
  ('s_confetti','🎊','confetti','daily_perfect',152),
  ('s_butterfly','🦋','butterfly','daily_perfect',153),

  -- Early bird → special_early_bird
  ('s_sunrise','🌅','sunrise','special_early_bird',160),
  ('s_coffee','☕','coffee','special_early_bird',161),
  ('s_croissant','🥐','croissant','special_early_bird',162),
  ('s_bird','🐦','bird','special_early_bird',163),

  -- Night owl → special_night_owl
  ('s_owl','🦉','owl','special_night_owl',170),
  ('s_night','🌃','night','special_night_owl',171),
  ('s_gstar','🌟','glowing-star','special_night_owl',172),
  ('s_tea','🍵','tea','special_night_owl',173),

  -- Habit builder → journey_20_reminders
  ('s_dna','🧬','dna','journey_20_reminders',180),
  ('s_running','🏃','running','journey_20_reminders',181),
  ('s_cycling','🚴','cycling','journey_20_reminders',182),
  ('s_climbing','🧗','climbing','journey_20_reminders',183),

  -- Founding star → special_founding_star
  ('s_fcrown','👑','founder-crown','special_founding_star',190),
  ('s_shooting','🌠','shooting-star','special_founding_star',191),
  ('s_medal2','🎖️','medal','special_founding_star',192),
  ('s_dove','🕊️','dove','special_founding_star',193),

  -- 30-day legend → journey_streak_30
  ('s_fullsun','🌞','full-sun','journey_streak_30',200),
  ('s_lion','🦁','lion','journey_streak_30',201),
  ('s_morpho','🦋','morpho','journey_streak_30',202),
  ('s_starstruck','🤩','star-struck','journey_streak_30',203),
  ('s_crystal','🔮','crystal-ball','journey_streak_30',204);

-- update handle_new_user to seed starter pack
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_unlocked_stickers (user_id, sticker_id)
  SELECT NEW.id, id FROM public.stickers WHERE mission_id IS NULL
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- backfill existing users with starter pack
INSERT INTO public.user_unlocked_stickers (user_id, sticker_id)
SELECT u.id, s.id
FROM auth.users u
CROSS JOIN public.stickers s
WHERE s.mission_id IS NULL
ON CONFLICT DO NOTHING;
