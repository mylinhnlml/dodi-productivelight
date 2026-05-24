## Vision Board redesign + morning vision push notifications

### 1. Database changes (one migration)

- Add to `profiles`:
  - `vision_quote text` (nullable)
  - `vision_images text[] not null default '{}'` — ordered list of image URLs (max 6 enforced client-side)
  - `vision_notification_time time` (nullable; `null` = off)
- Create `push_subscriptions` table:
  - `id uuid pk`, `user_id uuid not null`, `subscription jsonb not null`, `endpoint text unique` (so re-subscribes upsert), `created_at timestamptz`
  - RLS: users select/insert/delete only their own
- Create storage bucket `vision-board` (public), with RLS:
  - Public read; authenticated users may insert/update/delete objects under `<their uid>/...`
- Update the `profiles` UPDATE policy WITH CHECK to allow editing `vision_quote`, `vision_images`, `vision_notification_time` (current policy locks `points` — keep that condition, just unchanged).

### 2. Vision Board preview card (Profile page)

New section above Rewards, replacing nothing visible today (there is no existing Vision Board card — I'll add it where the spec implies):
- 200px tall, full-width, `rounded-3xl`, overflow-hidden
- First image as full-bleed background, gradient overlay, "✨ Vision Board" label + quote + "View all →"
- Empty state: dashed neu-inset placeholder with 🌅 and "Add your first vision"
- Tap → opens full-screen viewer

(Plus badge for free tier is a no-op — there is no tier system in the project. I'll skip the badge rather than fabricate one. Tell me if you want a static "Plus" pill regardless.)

Below the card, a reminder row:
- Switch ("amber when on") "Daily vision reminder"
- Native `<input type="time">` shown when on, defaults 08:00
- Subtext "We'll send your vision to you each morning ☀️"

### 3. Full-screen viewer (`VisionBoardViewer` component)

- Black, edge-to-edge fixed overlay; open/close scale+fade animations
- Horizontal `scroll-snap-type: x mandatory` container, each slide 100vw×100vh, `object-cover`
- Tap left 30% / right 30% to navigate (center is reserved for long-press)
- Auto-advance every 5s, pause on touch, resume 3s after release; quote re-animates on snap
- Dots (max 6), active pill (width 20)
- Top bar: × close, + Add (when <6 images)
- Long-press 600ms on a slide → action sheet "Remove this photo"
- Floating "✏️ Edit quote" pill above dots → bottom-sheet textarea (max 100 chars), saves to `profiles.vision_quote`
- Empty state with big "Add vision photo" CTA
- Adjacent-image-only loading (lazy + `loading="lazy"`), preloads next when 70% scrolled
- Image upload: client-side canvas compress to 1400px / JPEG 0.85, upload to `vision-board/<uid>/<ts>.jpg`, optimistic UI

### 4. Web Push pipeline

- Service worker `public/sw.js`: handles `push` event → showNotification, and `notificationclick` → focus app at `/?vision=1` (ProfilePage opens viewer on that param)
- Client: when toggle turns on, request `Notification.permission`, register SW, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })`, upsert into `push_subscriptions`
- Edge function `send-vision-notification`:
  - Runs hourly via `pg_cron` + `pg_net`
  - Selects profiles where `extract(hour from vision_notification_time) = extract(hour from now() at time zone 'utc')` (matched in UTC — noted as a caveat below)
  - Loads each user's subscriptions, sends Web Push with `npm:web-push` using VAPID keys
  - Title "Your vision is waiting ☀️", body = quote or fallback
- **Secrets I need from you:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:you@dodi.app`). Generate locally with `npx web-push generate-vapid-keys` — I'll prompt via the secrets tool once you confirm.

### 5. Caveats / things worth flagging

- **UTC matching:** the spec says "user-chosen time" but stores it as a bare `time` with no timezone. I'll match in UTC. If users are in non-UTC zones, 8 AM means 8 AM UTC. Real solution would also store an IANA tz on profile — happy to add if you want.
- **iOS Safari:** Web Push only works on iOS 16.4+ and only when the site is installed to home screen as PWA. The UI will still show "enable in browser settings" if `Notification.permission` is `denied` / `default`.
- **Plus-tier badge** in preview card: omitted (no tier system exists). Say the word and I'll add a static badge.
- **Haptics** via `navigator.vibrate(30)` only works on Android Chrome; iOS will silently no-op — that's expected.

### Files

- `supabase/migrations/<ts>_vision_board.sql` — schema + storage + RLS
- `supabase/functions/send-vision-notification/index.ts` — push sender
- `public/sw.js` — service worker
- `src/components/VisionBoardCard.tsx` — preview card
- `src/components/VisionBoardViewer.tsx` — full-screen viewer + sheets
- `src/components/VisionReminderRow.tsx` — toggle + time picker + SW registration
- `src/components/ProfilePage.tsx` — wire new components in, extend Profile type
- `src/pages/Index.tsx` — read `?vision=1` query and auto-open viewer when present (for notification taps)

### Order of operations

1. Run migration (waits for your approval).
2. Ask you for VAPID secrets via the secrets tool.
3. After secrets land, build UI + edge function + service worker in one batch.
4. Schedule the cron job via `supabase--insert` (per project rules, cron SQL with the function URL goes through insert, not migration).

Approve and I'll start with the migration; otherwise tell me what to adjust (Plus badge? skip notifications? store timezone?).
