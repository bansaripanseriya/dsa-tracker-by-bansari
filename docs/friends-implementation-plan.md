# Friends & Weekly Leaderboard — Implementation Plan

Design canvas: https://claude.ai/artifact/GSB1dfp2H5jaSTvov6TDP3
(Friends tab, friend profile, find friends, invite landing, mobile, guest/empty states.)

---

## Status

| Phase | State | Notes |
|---|---|---|
| 1. Shared data & unique counting | **Done** (2026-11-24) | See "Phase 1 — what shipped" below. |
| 2. Solve tracking | **Done** (2026-11-24) | See "Phase 2 — what shipped" below. |
| 3. Identity | **Done** (2026-11-24) | See "Phase 3 — what shipped" below. |
| 4. Friendships & search API | **Done** (2026-11-24) | See "Phase 4 — what shipped" below. |
| 5. Leaderboard API | **Done** (2026-11-24) | See "Phase 5 — what shipped" below. |
| 6. Frontend | Not started | |
| 7. Migration, seed, rollout | Partly done | Seed finished early (phases 3 and 5); migration script and rollout remain. |

---

## Agreed decisions (do not change without discussion)

| Area | Decision |
|---|---|
| Identity | System-generated, permanent **friend tag**: 7 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/1/I/L/O). Stored **without** `#`, always shown and typed **with** `#`. No usernames. |
| Finding people | `#…` → exact tag. Full email → exact match (same `normalizeEmail` as registration). Anything else (2+ chars) → fuzzy name search. Emails are never returned. |
| Discoverability | **Open by default, opt-out.** Tag and exact email always work (no setting). Name search is **on** for everyone, new and existing users; one switch, "Show me in name search", turns it off. No one-time prompt. |
| Visibility | Signed-out: name, avatar, tag. Signed-in non-friend: + total solved. Friend: + streaks, weekly points, difficulty breakdown, check-in heatmap, recent solves. Enforced on the server. Non-friend profile → **404**. API uses tags as public ids, never Mongo `_id`. |
| Friendship | Mutual. Invite link `/friends/add/:TAG` **only sends a request** (no auto-friend). Crossing requests auto-accept. Decline / cancel / unfriend delete the record, nobody is notified, **no re-request cooldown**. |
| Scoring | Easy **5**, Medium **10**, Hard **15**, once per unique LeetCode number, credited at first solve (`solvedAt` never moves). Week = **Monday 00:00 IST**. Leaderboard is friends-only, computed on read. **No points cap.** |
| Counting | Unique problems everywhere. Ticking a problem marks it in every sheet section it appears in. Practice-only problems 139, 474, 494 are appended to the sheet → **1,677** problems (Easy 449 · Medium 884 · Hard 344). |

---

## Ground rules

- Each phase is shippable on its own and keeps the existing client working.
- Sheet keys (`sectionId_index`) are **positional** — only ever **append** problems to a section, never insert or reorder.
- Every new route handler has `try/catch` with a 500 JSON response. (The pre-existing missing error handling in `routes/progress.js` is otherwise left for the bug-fix release; we only wrap the code we add.)
- New pure logic gets a `node:test` unit test (`server/test/*.test.js`, run with `npm test --prefix server`).
- Local testing: `npm run dev`, `npm run seed` (see README).

---

## Phase 1 — Shared data & unique counting  *(client + data, no API change)*

**Goal:** one source of problem data for client and server; stats count unique problems; a tick applies to every section.

1. **Create `shared/`** at the repo root (plain ESM, no dependencies):
   - `shared/data/problems.js` ← move from `client/src/data/problems.js`
   - `shared/data/practicePlan.js` ← move from `client/src/data/practicePlan.js`
   - `shared/problemIndex.js` — built once at import:
     - `SHEET_KEY_TO_LC: Map<"sid_idx", lcNumber>`
     - `PRACTICE_KEY_TO_LC: Map<"pDay_idx", lcNumber>`
     - `LC_INFO: Map<lcNumber, { name, difficulty, sheetKeys: string[] }>`
     - `TOTALS: { all, easy, medium, hard }` (unique)
     - `lcSetFromKeys(sheetDone, practiceDone): Set<number>`
   - `shared/scoring.js` — `POINTS = { Easy: 5, Medium: 10, Hard: 15 }`, `pointsFor(difficulty)`, `weekRangeIST(now, offset) → { start, end }` (IST is UTC+5:30 with no DST).
   - ~~`shared/streak.js`~~ — deferred to Phase 4 (see "what shipped").
2. **Append the 3 practice-only problems** (append only):
   - Section 10 *Dynamic Programming — 1D*: `[139,"Word Break","Medium"]`, `[494,"Target Sum","Medium"]`
   - Section 11 *Dynamic Programming — 2D / Grid*: `[474,"Ones and Zeroes","Medium"]`
3. **Wire the client to `shared/`:**
   - `client/vite.config.js`: `resolve.alias['@shared'] = path.resolve(__dirname, '../shared')` and `server.fs.allow: ['..']` (Vite blocks files outside `client/` by default).
   - Update imports in `SheetTab.jsx`, `PracticeTab.jsx`, `Tracker.jsx`, `utils/practiceSheetSync.js`, `utils/sheetStats.js`, and any `utils/streak.js` importers.
4. **Unique counting:**
   - `utils/sheetStats.js` → `computeSheetStats` counts unique LC numbers from `sheetDone` against `TOTALS` (Streak tab shows `x / 1,677`).
   - `SheetTab.jsx` `totalProblems()` and the header note in `Tracker.jsx:285` → `TOTALS.all` ("1,677 problems · 25 topics").
   - Per-section counters in `SheetTab` stay per section.
5. **Tick everywhere:**
   - New helpers in `utils/practiceSheetSync.js`: `toggleProblemEverywhere(sheetDone, key)` (adds or removes **all** keys of that LC number) and `expandSheetDone(keys)` (adds the sibling keys of every ticked problem).
   - Use `toggleProblemEverywhere` in `Tracker.jsx` `_toggleSheet` and in `guestProgress.js` `applyPendingToggle` (`'sheet'` branch).
   - Run `expandSheetDone` when hydrating progress (guest and server effects in `Tracker.jsx`, and in `mergeWithServerProgress`) so old partial ticks show in every section.
   - Stars (`sheetSaved`) stay per section — unchanged.

**Done when:** ticking 392 *Is Subsequence* shows it ticked in all 5 sections and the Streak tab counts it once; the 3 new problems appear in the DP sections; `npm run build` passes; unit tests for `problemIndex`, `toggleProblemEverywhere`, `expandSheetDone`, `weekRangeIST` pass.

### Phase 1 — what shipped

- `client/src/data/*` moved to `shared/data/*` with `git mv` (history kept). `shared/package.json` declares `"type": "module"`.
- New `shared/problemIndex.js` and `shared/scoring.js`; client imports via the `@shared` alias (`client/vite.config.js`).
- Appended 139 *Word Break* and 494 *Target Sum* to section 10, 474 *Ones and Zeroes* to section 11 → 2,530 rows, 1,677 unique.
- **Data fix:** 1636 *Sort Array by Increasing Frequency* was Easy in section 1 but Medium in sections 19 and 20; corrected to Easy (LeetCode's difficulty). A test now fails on any difficulty conflict.
- `SheetTab` and `StreakTab` stats count unique problems; header note shows 1,677.
- Ticking/unticking a sheet row applies to every section; loaded progress is expanded the same way (and saved back on the next sync).
- `server/test/problemIndex.test.js`, `server/test/scoring.test.js` (15 tests); `npm test` at the root.
- `seed.js` reads from `shared/` and reports unique problems solved.
- **Moved to Phase 4:** extracting `utils/streak.js` into `shared/` — the server first needs it for the friend profile, and it needs a `today` parameter added at the same time.

---

## Phase 2 — Solve tracking  *(server only, invisible to users)*

**Goal:** record *when* each problem was first solved, without changing what the client sends.

1. **`server/src/models/Solve.js`**
   ```js
   { userId, lcNumber, difficulty, points, solvedAt, active, source: 'live'|'backfill' }
   indexes: { userId: 1, lcNumber: 1 } unique · { userId: 1, solvedAt: 1 }
   ```
2. **`User` model:** add `stats: { totalSolved, easy, medium, hard, lastCheckin, updatedAt }`.
3. **`server/src/lib/solves.js`**
   - `diffSolves(oldSet, newSet) → { added, removed }`
   - `applySolveDiff(userId, { added, removed }, now)` — `bulkWrite`: added → upsert with `$setOnInsert: { solvedAt: now, difficulty, points, source: 'live' }, $set: { active: true }`; removed → `active: false`.
   - `computeStats(lcSet, checkins)`.
4. **`routes/progress.js` `PUT /`:** before overwriting, compute `oldSet = lcSetFromKeys(stored)`; after applying the body, `newSet = lcSetFromKeys(updated)`; set `user.stats`; save; then `applySolveDiff`. Wrap the new code in `try/catch`.
5. Add `server/test/solves.test.js` and `"test": "node --test"` to `server/package.json`.

**Done when:** ticking a problem creates one `solves` doc; ticking it in another section creates nothing new; unticking every key sets `active: false`; re-ticking reactivates it with the **original** `solvedAt`; `user.stats` matches the Streak tab numbers.

### Phase 2 — what shipped

- `server/src/models/Solve.js`; `User` gained `stats` and `solvesSyncedAt`.
- `server/src/lib/solves.js` — `diffSolves`, `computeStats`, `backfillSolves`, `syncSolves`.
- **Changed from the plan: reconcile against the `solves` collection, not the previous progress.** `syncSolves` compares the new progress with the user's existing solve documents, so a failed or interrupted sync is repaired by the next save. The previous progress is only used once, for the backfill.
- **Added: lazy backfill.** If `solvesSyncedAt` is null, the first progress save after deploy records everything already done as `source: 'backfill'` before anything else. This closes a farming gap before the Phase 7 migration runs (otherwise un-ticking and re-ticking an old problem would have created a fresh `live` solve). The migration will call the same `backfillSolves`.
- `PUT /api/progress` saves progress first, then syncs solves; a sync error is logged and doesn't fail the request. The handler now has `try/catch` (the GET handler is untouched — bug-fix release).
- Tests: `server/test/solves.test.js` (pure) and `server/test/solves.db.test.js` (real MongoDB, throwaway `dsa-tracker-test` DB, auto-skips) — 21 tests total.
- `npm run seed` now writes `stats`, clears demo users' solves and resets `solvesSyncedAt`.
- Verified end to end through the API: an existing user's 164 problems were backfilled and a newly ticked Hard became one `live` solve worth 15 points.

---

## Phase 3 — Identity: tags, discoverability, profile name

1. **`User` model additions**
   ```js
   friendTag:       { type: String, unique: true, sparse: true },
   discoverability: { byName: { type: Boolean, default: true } },   // opt-out
   nameSearch:      { tokens: [String], trigrams: [String] }   // select: false, indexed
   ```
   Pre-save hook: rebuild `nameSearch` when `name` changes.
2. **`server/src/lib/tags.js`** — `generateTag()` (`crypto.randomInt`), `parseTagInput('#7k3qx9p') → '7K3QX9P' | null`, `assignTagIfMissing(user)` (retry up to 5× on duplicate-key error).
3. **`server/src/lib/nameSearch.js`** — `normalizeName` (lowercase, strip diacritics), `tokensOf`, `trigramsOf`, `scoreName(name, query)` (starts-with 4 > word-starts-with 3 > contains 2 > one typo 1 — same as the canvas).
4. **Routes**
   - `POST /auth/register`: assign a tag.
   - `GET /auth/me`: lazily assign a missing tag; also return `friendTag` and `discoverability`.
   - **New** `PUT /api/auth/profile` `{ name }` (1–120 chars) — names can't be changed today.
   - **New** `PUT /api/users/me/discoverability` `{ byName }`.
5. **`Profile.jsx`:** replace the fake `@<email-prefix>` (`Profile.jsx:62, 256`) with `#TAG` + copy button; wire *Full Name* to `PUT /auth/profile`; replace the non-functional *Username* input (`Profile.jsx:413-414`) with a read-only *Friend tag* field. Other unsaved fields (phone, bio, socials) are out of scope.

**Done when:** new and existing users get a tag on next `/me`; everyone is in name search unless they switch it off; renaming updates `nameSearch`; the Profile page never shows any part of the email except in the Email field.

### Phase 3 — what shipped

- `User`: `friendTag` (unique sparse index, **no default** — a `null` would break the sparse index), `discoverability.byName` (default `true`), `nameSearch` (`select: false`, both arrays indexed) kept in sync by a `pre('save')` hook.
- `server/src/lib/tags.js`, `lib/nameSearch.js` (incl. `scoreName`, ready for Phase 4), `lib/identity.js` (`ensureFriendTag` — conditional update, safe under concurrent requests; retries on the rare duplicate).
- Routes: tag at `/register`; lazy tag at `/me` (+ `discoverability` in the response); **new** `PUT /api/auth/profile`; **new** `routes/users.js` with `PUT /api/users/me/discoverability` (mounted at `/api/users`).
- Client: `AuthContext` holds `discoverability` and exposes `updateName` / `updateDiscoverability`. `Profile.jsx`: `#TAG` replaces the fake `@<email prefix>` (sidebar + read-only *Friend tag* field with Copy); *Full Name* now saves via **Save name**.
- **Pulled forward from Phase 7:** seed gives demo users fixed tags (`#A4TZ6HW`, `#7K3QX9P`, `#R8M2VQA`, `#K9P3NXE`) and adds `kavya@example.com` (`#W6DM3XF`) with name search off, for testing Phase 4.
- Tests (38 total): `tags.test.js`, `nameSearch.test.js`, `identity.db.test.js`; DB tests now each use their own throwaway database via `test/helpers/db.js` (they run in parallel).
- Verified through the API: existing user gets a stable tag on `/me`; registration returns a tag; rename rebuilds the index; empty name → 400; discoverability on/off; no token → 401.
- **Not done / left as is:** `/me` still loads the full resume document (bug-fix release).

---

## Phase 4 — Friendships & search API

1. **Dependencies (server):** `express-rate-limit`, `validator@^13.15` (explicit; it is currently only a transitive dependency of `express-validator`).
2. **`server/src/models/Friendship.js`**
   ```js
   { userA, userB, requestedBy, status: 'pending'|'accepted', createdAt, acceptedAt }
   // userA < userB (sorted). Indexes: { userA, userB } unique · { userA, status } · { userB, status }
   ```
3. **`server/src/lib/friendships.js`** — `pairOf(a, b)`, `relationship(meId, otherId) → 'self'|'none'|'outgoing'|'incoming'|'friends'`, `friendIds(meId)`, limits (200 friends, 50 pending outgoing).
4. **`shared/streak.js`** — move the pure functions from `client/src/utils/streak.js` (keep `client/src/utils/streak.js` as a re-export so existing imports keep working); functions that use "today" take an optional `today` argument so the server can call them deterministically.
5. **`server/src/lib/cards.js`** — `publicCard`, `memberCard`, `friendProfile` serializers (the **only** way user data leaves the API for other users).
6. **`middleware/auth.js`:** add `authOptional` (sets `req.user` when a valid token is present, never rejects).
7. **`server/src/routes/users.js`**
   - `GET /api/users/by-tag/:tag` — `authOptional`, rate-limited per IP → `publicCard`, or `memberCard` + `relationship` when signed in. 404 if not found.
   - `GET /api/users/search?q=` — auth, rate-limited per user. Mode by input: `#` → tag; contains `@` → `validator.normalizeEmail` exact match (partial email → `400 { reason: 'partial-email' }`); else token-prefix + trigram candidates (`'discoverability.byName': { $ne: false }`, limit 50) → `scoreName` → top 10 `memberCard`s with `relationship` and `matchType`. The `$ne: false` filter also covers users created before the field existed.
   - `PUT /api/users/me/discoverability` (from Phase 3).
8. **`server/src/routes/friends.js`**
   | Route | Behaviour |
   |---|---|
   | `GET /api/friends` | friends with summary stats |
   | `GET /api/friends/requests` | `{ incoming, outgoing }` as memberCards |
   | `GET /api/friends/summary` | `{ pendingIncoming }` for the header badge |
   | `POST /api/friends/requests` `{ tag }` | self → 400 · none → create pending (201) · pending by me → 200 no-op · pending by them → **accept** · accepted → 409 · duplicate-key race → re-read and re-apply |
   | `POST /api/friends/requests/:tag/accept` | incoming pending only |
   | `DELETE /api/friends/requests/:tag` | decline (incoming) or cancel (outgoing) |
   | `DELETE /api/friends/:tag` | unfriend |
   | `GET /api/friends/:tag/profile` | `friendProfile` (stats, current/best streak, 26-week check-ins, weekly points + rank, last 10 live solves, friends since) or **404** |
9. **`index.js`:** mount `/api/users` and `/api/friends`; `app.set('trust proxy', 1)` so per-IP limits work behind Render's proxy.

**Done when:** with seeded users you can, via curl: find by `#tag`, by full email, by fuzzy name (`rohn` → Rohan), and a user who switched name search off is not found by name; send / cancel / decline / accept; crossing requests become friends; a non-friend profile returns 404; no response ever contains another user's email or `_id`.

### Phase 4 — what shipped

- Dependencies: `express-rate-limit@8`, `validator@13` (explicit).
- `models/Friendship.js`; `lib/friendships.js` (state machine + read helpers, `FriendError`); `lib/cards.js` (`publicCard` / `memberCard` / `friendSummary`); `lib/profile.js` (`buildFriendProfile`); `lib/search.js` (`searchUsers`); `middleware/rateLimits.js`; `authOptional`; `routes/friends.js`; `routes/users.js` gained `by-tag`, `avatar` and `search`; `index.js` mounts `/api/friends` and trusts one proxy hop.
- `shared/streak.js` with `calcStreak(checkins, today)`, `istDateStr`, `addDays`; the client re-exports `calcStreak` from it.
- **Changed from the plan:**
  - Search returns **200** with `reason: 'invalid-tag' | 'partial-email' | 'too-short'` instead of a 400, so the UI just shows a hint.
  - Only `calcStreak` moved to `shared/` (that's all the server needs); the rest of `client/src/utils/streak.js` stays client-side.
  - Search also returns one-typo **close** matches after exact ones (e.g. `rohan` → Rohan Das, Rohan Iyer, then Rohini as "close").
  - Name search ranks candidates by trigram overlap inside MongoDB before the 50-candidate cap, so common prefixes don't push the best matches out.
- **Added (not in the plan):**
  - `GET /api/users/by-tag/:tag/avatar` — cards carry `avatar.photoUrl` instead of base64 photos, so lists stay small; raster types only (an SVG on our origin could run scripts), `nosniff`, `default-src 'none'`.
  - `ensureStats` (on `/auth/me` and for accounts found by email) so friends see correct solved counts for accounts that haven't saved progress since Phase 2.
  - The friend profile 404 is identical for unknown tags and non-friends.
- Weekly **rank** on the friend profile is left for Phase 5 (it needs the leaderboard).
- Tests (62 total): `cards.test.js` (no email / id / private data in any card), `streak.test.js`, `friendships.db.test.js` (request → accept → unfriend, crossing requests, decline/cancel then re-request, self, racing requests, bulk relationships, profile week boundaries), `search.db.test.js` (tag, email normalization, partial email, hidden users, fuzzy ranking, no leaks, untagged account found by email).
- Verified end to end over HTTP with the seeded users, including a scan of every response for emails, ids and private fields (none).

---

## Phase 5 — Weekly leaderboard API

1. **`server/src/lib/leaderboard.js`** — `weekly(meId, offset)`:
   - `{ start, end } = weekRangeIST(now, offset)`
   - aggregate `solves` for `[me, ...friendIds]`, `active: true`, `source: 'live'`, `solvedAt ∈ [start, end)` → points and E/M/H counts per user
   - add friends with 0 points; join `publicCard`s; sort; competition ranking (1, 2, 2, 4)
   - `rankChange` by running the same for `offset + 1`
2. **`GET /api/leaderboard/weekly?offset=0..8`** → `{ week: { start, end, live }, rows, me }`.
3. Tests: week boundary (Sun 23:59 IST vs Mon 00:00 IST), ties, a backfilled solve never counts, a re-ticked old problem doesn't count this week.

**Done when:** the seeded data produces the same shape of leaderboard as the canvas Friends tab.

### Phase 5 — what shipped

- `server/src/lib/leaderboard.js` — `weekScores` (one aggregation per week), `competitionRanker` (1, 2, 2, 4), `weeklyLeaderboard`; `server/src/routes/leaderboard.js` → `GET /api/leaderboard/weekly?offset=0..8`.
- Rows are `memberCard`s plus `points`, `easy`, `medium`, `hard`, `solved`, `rank`, `rankChange`, `isMe`. **`rankChange` is `null` when nobody scored in the previous week** (otherwise everyone would look like they dropped from a 0–0 tie).
- Users whose account no longer exists are left out of the ranking.
- The friend profile now includes `thisWeek.rank` / `thisWeek.of` (their place on the viewer's leaderboard), finishing what Phase 4 left open.
- **Pulled forward from Phase 7:** the seed creates demo friendships and `live` solves in this and last week with the mockup's numbers (Priya 135 · Rohan 110 · Aditi 95 · Kavya 65; last week Rohan 150 and a 105–105 tie).
- Tests (67 total): `leaderboard.test.js` (ranking), `leaderboard.db.test.js` (the mockup standings including the tie and rank changes, strangers excluded, backfill / un-ticked / Sunday-23:59 / next-week solves excluded, no friends, no previous week).
- Verified over HTTP: both weeks, offset validation (400), auth (401), profile rank, and the full loop — ticking a Hard through `PUT /api/progress` moved Aditi from 95 to 110, tied 2nd with Rohan.

---

## Phase 6 — Frontend

Map each screen to its canvas board.

1. **API layer:** `client/src/api/friends.js` (thin wrappers over the existing axios `api`) and `client/src/hooks/useFriends.js` (load / refresh; refetch on window focus).
2. **Routes (`App.jsx`)**
   - `/?tab=friends` — extend the allowed tabs in `Tracker.jsx:44-49`.
   - `/friends/find` (protected) — *Add friend* board.
   - `/friends/:tag` (protected) — *Friend profile* board.
   - `/friends/add/:tag` (**public**, not wrapped in `PublicOnly`/`ProtectedOnly`) — *Invite landing* boards.
3. **Header:** add a *Friends* nav button (desktop `Header.jsx:271-280`, mobile `Header.jsx:399-406`) with a pending-requests badge from `/friends/summary`.
4. **Components** (`client/src/components/friends/`): `FriendsTab`, `Leaderboard` (+ `Podium`, week switcher, nudge line), `FriendRequests`, `FriendsList`, `GuestFriends` / `EmptyFriends`.
   Pages: `FindFriends.jsx` (includes the friend-tag card and the "Show me in name search" switch), `FriendProfile.jsx`, `InviteLanding.jsx`.
   Optional: a one-time dismissible note on the Friends tab — "People can now find you by name · Change" — remembered in `localStorage`, no server state.
5. **Reuse charts:** extract the heatmap and the difficulty rings (`TripleRingProgress`, `StreakTab.jsx:182-206`) from `StreakTab.jsx` into `components/charts/` and use them on the friend profile.
6. **Pending invite:** `InviteLanding` stores `dsa-pending-invite` for signed-out visitors; `Login.jsx:31` and `Register.jsx:28` navigate back to `/friends/add/<tag>` when it is set (and clear it).
7. **Styles:** `client/src/styles/friends.css` using the existing tokens; check both layouts (doodle / classic) and both themes.

**Done when:** the manual QA checklist below passes on desktop and at phone width.

---

## Phase 7 — Migration, seed, rollout

1. **`server/scripts/migrate-friends.js`** (`npm run migrate:friends`, idempotent). Per user:
   assign tag → build `nameSearch` → set `discoverability.byName: true` if missing → `expandSheetDone` → `backfillSolves(user, lcSetFromKeys(progress))` for users with `solvesSyncedAt: null` (already idempotent, from Phase 2) → compute `stats`.
2. ~~**Update `server/scripts/seed.js`**~~ — **done**: tags and a hidden-from-name-search user in Phase 3; friendships and `live` solves for this and last week in Phase 5.
3. **Rollout on Render** (no new env vars):
   1. Deploy Phases 1–5 (backwards compatible; UI unchanged except unique counting).
   2. Run the migration once (Render shell: `npm run migrate:friends --prefix server`).
   3. Deploy Phase 6 (UI).

---

## Testing

**Unit (`node:test`):** `problemIndex`, `toggleProblemEverywhere`, `expandSheetDone`, `weekRangeIST`, `diffSolves`, tag generate/parse, `normalizeEmail` parity with registration (Gmail dots and `+suffix`), `scoreName`, leaderboard ranking with ties, the friendship state machine.

**Manual QA (seeded users, password `password123`):**
- [ ] Ticking a problem marks all its sections; Streak tab shows `/1,677`.
- [ ] Existing users are findable by tag, email and name right after the migration, with no prompt.
- [ ] Find by `#tag`, full email, fuzzy name; partial email shows the hint; switching "Show me in name search" off hides you from name search but not from tag or email.
- [ ] Send → cancel; send → other user declines; both send → auto-friends.
- [ ] Invite link signed out → sign in → returns to invite → send request. All 7 invite states.
- [ ] Leaderboard: points 5/10/15, ties share a rank, last week view, rank arrows, nudge line.
- [ ] Friend profile shows full data; a non-friend's profile URL shows not found.
- [ ] No API response for another user contains an email or `_id` (check the network tab).
- [ ] Doodle + classic layouts, light + dark themes, phone width.

---

## Out of scope (later)

Points cap · decline cooldown · global leaderboard · LeetCode-verified solves (`source: 'leetcode'`) · link previews for invites · notifications / emails for requests · the deferred bug-fix release (progress-route error handling, reset-link base URL, large base64 files on the user document, note-HTML sanitizing).
