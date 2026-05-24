
CREATE OR REPLACE FUNCTION public.enforce_mission_progress_monotonic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
  -- New: claimed_at can only be set when completed_at is already set
  IF NEW.claimed_at IS NOT NULL AND OLD.claimed_at IS NULL
     AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'cannot claim a mission that is not completed';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_mission_progress_insert_trg ON public.mission_progress;
CREATE TRIGGER enforce_mission_progress_insert_trg
BEFORE INSERT ON public.mission_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_progress_insert();

DROP TRIGGER IF EXISTS enforce_mission_progress_monotonic_trg ON public.mission_progress;
CREATE TRIGGER enforce_mission_progress_monotonic_trg
BEFORE UPDATE ON public.mission_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_progress_monotonic();

DROP TRIGGER IF EXISTS enforce_sticker_unlock_trg ON public.user_unlocked_stickers;
CREATE TRIGGER enforce_sticker_unlock_trg
BEFORE INSERT ON public.user_unlocked_stickers
FOR EACH ROW EXECUTE FUNCTION public.enforce_sticker_unlock();

DROP TRIGGER IF EXISTS enforce_user_xp_monotonic_trg ON public.user_xp;
CREATE TRIGGER enforce_user_xp_monotonic_trg
BEFORE UPDATE ON public.user_xp
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_xp_monotonic();
