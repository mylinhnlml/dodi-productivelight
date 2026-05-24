
-- Enforce monotonic, anti-cheat constraints on user_xp via BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.enforce_user_xp_monotonic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- user_id is immutable
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;

  -- total_xp can only stay the same or increase
  IF NEW.total_xp < OLD.total_xp THEN
    RAISE EXCEPTION 'total_xp cannot decrease';
  END IF;

  -- streak_count: allow same, reset to 1, or +1 only
  IF NEW.streak_count <> OLD.streak_count
     AND NEW.streak_count <> 1
     AND NEW.streak_count <> OLD.streak_count + 1 THEN
    RAISE EXCEPTION 'streak_count can only stay, reset to 1, or increment by 1';
  END IF;

  -- perfect_days: cannot lose entries
  IF NOT (OLD.perfect_days <@ NEW.perfect_days) THEN
    RAISE EXCEPTION 'perfect_days cannot remove entries';
  END IF;

  -- stickers_used: cannot lose entries
  IF NOT (OLD.stickers_used <@ NEW.stickers_used) THEN
    RAISE EXCEPTION 'stickers_used cannot remove entries';
  END IF;

  -- install_date is immutable
  IF NEW.install_date IS DISTINCT FROM OLD.install_date THEN
    RAISE EXCEPTION 'install_date is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_xp_monotonic_trg ON public.user_xp;
CREATE TRIGGER enforce_user_xp_monotonic_trg
BEFORE UPDATE ON public.user_xp
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_xp_monotonic();

-- Enforce monotonic constraints on mission_progress
CREATE OR REPLACE FUNCTION public.enforce_mission_progress_monotonic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  IF NEW.mission_id IS DISTINCT FROM OLD.mission_id THEN
    RAISE EXCEPTION 'mission_id is immutable';
  END IF;
  IF NEW.progress < OLD.progress THEN
    RAISE EXCEPTION 'progress cannot decrease';
  END IF;
  IF OLD.completed_at IS NOT NULL
     AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'completed_at is immutable once set';
  END IF;
  IF OLD.claimed_at IS NOT NULL
     AND NEW.claimed_at IS DISTINCT FROM OLD.claimed_at THEN
    RAISE EXCEPTION 'claimed_at is immutable once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_mission_progress_monotonic_trg ON public.mission_progress;
CREATE TRIGGER enforce_mission_progress_monotonic_trg
BEFORE UPDATE ON public.mission_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_progress_monotonic();
