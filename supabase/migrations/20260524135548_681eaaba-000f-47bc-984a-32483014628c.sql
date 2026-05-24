
-- 1) Cap XP delta per UPDATE to prevent inflated jumps (e.g. 999999)
CREATE OR REPLACE FUNCTION public.enforce_user_xp_monotonic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;

  IF NEW.total_xp < OLD.total_xp THEN
    RAISE EXCEPTION 'total_xp cannot decrease';
  END IF;

  -- Cap per-update XP delta. Largest legitimate single mission reward is well under 500.
  IF NEW.total_xp - OLD.total_xp > 500 THEN
    RAISE EXCEPTION 'total_xp increment too large';
  END IF;

  IF NEW.streak_count <> OLD.streak_count
     AND NEW.streak_count <> 1
     AND NEW.streak_count <> OLD.streak_count + 1 THEN
    RAISE EXCEPTION 'streak_count can only stay, reset to 1, or increment by 1';
  END IF;

  IF NOT (OLD.perfect_days <@ NEW.perfect_days) THEN
    RAISE EXCEPTION 'perfect_days cannot remove entries';
  END IF;

  IF NOT (OLD.stickers_used <@ NEW.stickers_used) THEN
    RAISE EXCEPTION 'stickers_used cannot remove entries';
  END IF;

  IF NEW.install_date IS DISTINCT FROM OLD.install_date THEN
    RAISE EXCEPTION 'install_date is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Prevent inserting mission_progress rows that are already claimed
CREATE OR REPLACE FUNCTION public.enforce_mission_progress_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'claimed_at must be null on insert';
  END IF;
  IF NEW.progress < 0 THEN
    RAISE EXCEPTION 'progress must be >= 0';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS mission_progress_insert_guard ON public.mission_progress;
CREATE TRIGGER mission_progress_insert_guard
BEFORE INSERT ON public.mission_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_progress_insert();

-- 3) Only allow unlocking a sticker tied to a mission if that mission is claimed
CREATE OR REPLACE FUNCTION public.enforce_sticker_unlock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_mission_id text;
  v_claimed timestamptz;
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;

  SELECT mission_id INTO v_mission_id FROM public.stickers WHERE id = NEW.sticker_id;
  IF v_mission_id IS NULL THEN
    -- sticker has no mission requirement (default unlock) — allow
    RETURN NEW;
  END IF;

  SELECT claimed_at INTO v_claimed
  FROM public.mission_progress
  WHERE user_id = NEW.user_id AND mission_id = v_mission_id;

  IF v_claimed IS NULL THEN
    RAISE EXCEPTION 'mission not claimed; cannot unlock sticker';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS user_unlocked_stickers_insert_guard ON public.user_unlocked_stickers;
CREATE TRIGGER user_unlocked_stickers_insert_guard
BEFORE INSERT ON public.user_unlocked_stickers
FOR EACH ROW EXECUTE FUNCTION public.enforce_sticker_unlock();

-- 4) Restrict avatars bucket to safe image MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'avatars';
