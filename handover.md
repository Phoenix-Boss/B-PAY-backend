# B-Pay Backend — Session Handover

This file is a task queue for Claude sessions on Anthropic's free tier,
where a session can end at any time without warning. **Tasks are
deliberately small — one file, one concern, one commit.** Never try to
do two tasks in one session, and never leave a task half-finished; if
a task turns out to be bigger than it looked, stop, commit whatever is
cleanly done, note the split in this file, and leave the rest as a new
task for the next session.

The number of sessions here is NOT fixed. Add tasks as you find new
issues. Split a task further if it's still too big once you're in it.
There is no target count to hit — the queue is exactly as long as it
needs to be.

---

## How every session works

1. **Pull latest first.** `git status --short` and `git log --oneline -5`
   to see where the repo actually is. If there are local commits ahead
   of what you expect, that's fine — just don't redo work.
2. **Check whether the previous commit and PR actually landed, before
   doing anything else.** Because of the two-hop fork→PR flow (see
   "Pull request workflow" section below), a commit can be pushed to
   `origin/main` (our fork) and *still* be sitting in an unmerged PR —
   don't assume "it's on origin/main" means "the real owner has it."
   Concretely:
   ```
   git remote add upstream https://github.com/Phoenix-Boss/B-PAY-backend.git 2>/dev/null
   git fetch origin && git fetch upstream
   git log --oneline origin/main -3
   git log --oneline upstream/main -3
   ```
   - If `origin/main`'s latest commit isn't `upstream/main`'s latest
     (or an ancestor of it) — PR #2 is **still open, unmerged**. That's
     the expected, intentional steady state (see "Pull request
     workflow" below — we're deliberately accumulating every session's
     commits into this one PR until Phoenix-Boss merges it all at
     once), so it doesn't block starting a new task. Just confirm PR
     #2 itself is still open and still the one and only PR (don't
     create a second one — see below), and note the current state
     plainly to the human when you hand off this session's patch.
   - If a human-provided update says a PR *was* merged, still verify
     it here against `upstream/main` yourself rather than taking the
     claim at face value — merges can be delayed, rejected, or land on
     a different branch than expected.
   - Either way, update the "Outstanding PRs status" note near the end
     of the "Pull request workflow" section below to reflect what you
     found, so the next session doesn't have to re-derive it.
3. **Read this whole file**, especially the "Confirmed research
   findings" section below — it exists so you don't have to re-derive
   facts a previous session already verified. Then find the **first
   unchecked `[ ]` task** in the queue, in order, and do only that one.
4. **Do the task.** Read the actual current code before changing
   anything — comments in this file describe what was true when
   written, but the previous session's own commit may have already
   changed things.
5. **Verify before committing.** This repo has no test suite yet, so
   at minimum run `node -e "import('./index.js')"` won't work without
   real env vars — instead use `node --check <file>` on every file you
   touched (pure syntax check, no env/network needed), e.g.:
   ```bash
   node --check providers/korapay.js
   node --check routes.js
   ```
   If your task adds a new dependency, run `npm install` and confirm
   it succeeds. If you changed `utils/helpers.js` currency/amount
   logic, write a tiny throwaway `node -e "..."` snippet to sanity
   check the math by hand before committing (delete the snippet after).
6. **Commit.**
   ```bash
   git add -A
   git commit -m "type(scope): short description — Task N"
   ```
   Write a real commit body explaining what you found and why you did
   it this way, the same level of detail as the "Confirmed research
   findings" entries below — the next session (and the human) reads
   this instead of your reasoning trace.
7. **Generate the patch.**
   ```bash
   git format-patch -1 HEAD -o /mnt/user-data/outputs
   mv /mnt/user-data/outputs/0001-*.patch /mnt/user-data/outputs/NNNN-short-description.patch
   ```
   Use the next free 4-digit number (check what's already in
   `/mnt/user-data/outputs` and in this file's "Patches issued so far"
   log below so numbers don't collide across sessions).
8. **Verify the patch actually applies** before handing it over —
   clone the repo fresh to `/tmp`, reset to the commit *before* yours,
   `git am` the patch, confirm it applies cleanly and `node --check`
   still passes. This has caught real mistakes before (see Mavins-web
   project history) — always do it, it takes seconds.
9. **Present the file** with the `present_files` tool so the human can
   see and download it.
10. **Tell the human the exact commands to run**, every time, verbatim —
   just `git am` + `git push origin main`, **no `gh pr create` line
   anymore** (see "Pull request workflow" section below — PR #2 is
   already open and reused for every session from here on; do not
   have the human run `gh pr create` again, it will just fail with
   "a pull request ... already exists" since one already covers this
   exact branch pair):
   ```
   git am ~/storage/downloads/NNNN-short-description.patch
   git push origin main
   ```
   (Termux's shared Downloads folder — confirmed earlier in this
   project as `~/storage/downloads`, lowercase, after
   `termux-setup-storage` has been run once. If a session ever gets a
   "no such file" report back, the first thing to check is exact
   case/spelling of that path, not the patch itself. Pushing to
   `origin/main` automatically adds the new commit to PR #2 — GitHub
   does this on its own for any open PR on that branch pair, no extra
   command needed.)
11. **Check the box** for the task you just did in this file as soon
    as the commit is confirmed **pushed** to `origin/main` (which
    auto-joins PR #2 — see below) — do NOT wait for the owner
    (Phoenix-Boss) to actually merge anything. Pushing the commit is
    this project's definition of "done" for a task; merge timing is
    the real owner's call, on their own schedule, and isn't something
    a session should block on or keep re-checking. Add a short "what
    was found / what changed" note under the task (same style as Task
    3/Task 4 in the Mavins-web project's handover.md — that project is
    the reference example for how this whole process should read),
    and if you know PR #2 is still unmerged as of this session, say
    so plainly in that note (e.g. "pushed, part of PR #2, not yet
    merged by Phoenix-Boss") rather than implying it landed upstream —
    that's what step 2's "Outstanding PRs" check-in is for on the
    *next* session, not a reason to leave this task's box unchecked
    now. Commit that edit to `handover.md` **as part of the same
    commit** as the code change (one commit, one patch, per session —
    don't split the code change and the checkbox update into two).
    split the code change and the checkbox update into two).

---

## Pull request workflow (fork → upstream) — read this before step 10 above

**This repo is a fork.** Confirmed directly against GitHub (not
assumed): `Zapier-codes/B-PAY-backend` is forked from, and its
`network_root_nwo`/parent is, `Phoenix-Boss/B-PAY-backend`. That
second repo is the **real owner's** repo — `Phoenix-Boss` — and only
they can merge into it. Every session's work reaches the real
codebase in two hops: (1) push to our own fork's `main`, (2) that
code sits in a pull request until Phoenix-Boss merges it.

**⚠️ There is already ONE open PR that covers this whole project —
PR #2 (`https://github.com/Phoenix-Boss/B-PAY-backend/pull/2`),
`Zapier-codes:main` → `Phoenix-Boss:main`. No session should ever run
`gh pr create` (or the browser compare-URL) again for this repo.**
GitHub only allows one open PR per branch pair, and — confirmed
directly by trying it — a second `gh pr create` attempt just fails
with `a pull request for branch "Zapier-codes:main" into branch
"main" already exists`, pointing back at PR #2. This isn't a fallback
behavior to guard against, it's the whole point: **every future
session's commit, once pushed to `origin/main`, joins PR #2
automatically** — GitHub appends new commits on a branch to whatever
open PR already exists for that branch, with zero extra command
needed. So step 10 above is now just `git am` + `git push origin
main`, full stop.

**Why we're doing it this way (explicit project decision, not a
guess):** the plan is to leave PR #2 open and keep accumulating every
session's commits into it — task after task — **until all the fixes
in this project's task queue are actually done**, rather than opening
and closing a separate small PR per task. Phoenix-Boss then reviews
and merges the whole batch **once, in one shot**, at whatever time is
convenient for him. This is intentional, not a workaround — don't
"helpfully" split things into smaller PRs, don't close PR #2 early,
and don't ask the human to merge anything on the fork side to try to
"clean up" — the fork's `main` accumulating commits *is* the plan.

**What this means for step 11 (marking a task done):** unchanged in
spirit from before — check the task's box as soon as its commit is
pushed to `origin/main`, don't wait for Phoenix-Boss to merge. The
only difference is there's no PR-open confirmation step anymore since
there's nothing new to open — pushing is now the entire finish line.

**What a session should still verify at the top of every session
(step 2 above):** that PR #2 is still open (hasn't been merged or
closed out from under this plan) and still targeting the right branch
pair. If a session's step-2 check ever finds PR #2 has been merged —
i.e. `upstream/main`'s latest commit is no longer `900db65` — that's
a real state change worth flagging clearly to the human (see the
status line below), since it may mean the queue-until-done plan needs
revisiting or a fresh PR will eventually be needed for whatever's
still unmerged. Until that happens, "PR #2 open, accumulating
commits, unmerged" is the fully expected steady state — not something
to chase, escalate, or try to fix.

**Outstanding PRs status (updated by whichever session last checked —
see step 2 above):** As of the session that wrote this paragraph, PR
#2 is **open** on `Phoenix-Boss/B-PAY-backend`, `Zapier-codes:main` →
`Phoenix-Boss:main`, containing three commits so far (`7b12a94`,
`a4f991c`, `981f5ed`) — **confirmed unmerged**, `upstream/main`'s
latest is still `900db65` (the earlier PR #1 merge, covering commits
only through `0616b8e`). Per the policy above, every new pushed commit
keeps joining this same PR #2 automatically; update this paragraph
(don't append a new one) each time a session's step-2 check finds
something has changed — new commits added, or (eventually) merged.

---

## Confirmed research findings (verified against primary sources — don't re-derive these, but do re-verify the specific endpoint page before shipping a task that depends on one)

**Paystack**
- Supports exactly 5 currencies: NGN, GHS, ZAR, KES, USD.
  Source: paystack.com developer docs, corroborated by multiple
  integration guides (Chargebee, Zoho, mctaba.com).
- Amounts are in **subunits** (multiply by 100) for all 5 currencies —
  this repo's `toSubUnit()`/`fromSubUnit()` already does this correctly
  for Paystack. Source: paystack.com/docs/api/ ("Sending an amount in
  subunits simply means multiplying the base amount by 100").
- Webhook signature: header `x-paystack-signature`, value is
  **HMAC-SHA512** of the **raw** request body, keyed with the secret
  key. Source: paystack.com/docs/payments/webhooks/ (primary/official).
  This repo has **no webhook receiver at all** yet — see Task queue.

**Korapay**
- Charges/initialize endpoint (`POST /api/v1/charges/initialize`) —
  amount appears to be in the **base currency unit**, NOT subunits.
  Evidence: official docs' Elixir client example shows
  `"amount" => "1000.00"` (a decimal string) for a charge status
  lookup, and a payout response shows `"amount": "100.00"` — kobo
  values wouldn't have a meaningful decimal part. This is **strong
  but secondary-source evidence, not a direct quote from the
  charges/initialize reference page itself** — the session that owns
  the Korapay task should open developers.korapay.com/docs and confirm
  directly before treating this as settled, then update this note to
  say "confirmed directly" once done.
- Supported currencies (payout/collection, varies by product): NGN,
  GHS, KES, ZAR, USD, XAF, XOF, EGP, TZS. Payment method availability
  is country-specific — mobile money for KE/GH/CM/CI/EG/TZ, bank
  transfer/pay-with-bank for NG, EFT for ZA, card broadly. Source:
  developers.korapay.com/docs/accept-payments and
  developers.korapay.com/docs/payout-via-api (both primary/official).
- Webhook signature: header `x-korapay-signature`, HMAC-SHA256 of the
  JSON body, keyed with the webhook secret. Source found so far is a
  secondary aggregator (lobehub.com), **not yet confirmed against
  developers.korapay.com/docs/webhooks directly** — do that as part of
  the webhook task, don't ship signature verification code based only
  on this note.
- This repo's provider file already has comments citing the correct
  `charges/initialize` and `charges/:reference` endpoints (fixed in a
  prior session, per the comments in `providers/korapay.js`) — no need
  to re-fix those paths, just verify the amount-unit question above.

**JuicyWay**
- Real, current docs: **https://docs.juicyway.com** (confirmed to
  exist and be current). There's also **https://docs.spendjuice.org**,
  which appears to be a *different, newer* product surface from the
  same company (card issuing, USDC wallets) — don't assume the two
  document the same endpoints. This repo's base URL
  (`api-sandbox.spendjuice.com` / `api.spendjuice.com`, set in
  `utils/helpers.js`) needs to be checked against docs.juicyway.com
  specifically, since that's the one describing "Collections and
  Payouts" (the actual use case here), not docs.spendjuice.org's
  card/wallet APIs.
- The existing `providers/juicyway.js` has an explicit
  `⚠️ Verify exact endpoint path in Juicyway docs` comment on the
  `/v1/charges` call — this was already flagged as unverified by
  whoever wrote it. Treat nothing in this file as confirmed.

**Payscribe**
- **Waiting on a docs link from the project owner.** Check the
  "PENDING_DOCS" note right below this section before starting any
  Payscribe task — if the link still isn't there, skip to the next
  task in the queue rather than guessing from the existing code's
  `sandbox.payscribe.ng` URL alone.

**PENDING_DOCS:**
`<!-- paste the Payscribe docs link here when the project owner provides it -->`

---

## Known issues already found (not yet fixed — each becomes its own task below)

- `render.yaml` runs `buildCommand: npm install && npm run build` and
  `startCommand: node dist/index.js`, but `package.json` has **no
  `build` script** and there is **no `dist/` directory or build step
  anywhere** in this repo (it's plain ESM `.js`, not compiled). As
  configured, a fresh Render deploy of this exact repo would fail at
  the build step. `tsconfig.json` exists but nothing in `package.json`
  invokes `tsc`, and the source is `.js` not `.ts` anyway, so it's
  unclear if the tsconfig is even meant to be used for a build, or is
  leftover scaffolding. **Investigate before assuming — this may
  already be handled by a different Render service config than what's
  in this repo's `render.yaml`, or `render.yaml` may be stale.**
- **No webhook receiver endpoint exists at all** — `routes.js` only has
  `POST /pay` and `GET /verify`. Every provider's real source of truth
  for "did the payment actually succeed" is a webhook, not client-side
  polling of `/verify`. This is a significant gap, not a small one —
  it's broken into multiple small tasks below rather than one big one.
- `ROUTING_RULES` in `routes.js` picks a provider from an abstract
  `action` string (`collect_payment` / `bank_transfer` / `payout` /
  `international`) — it has no awareness of currency, country, or
  which providers actually support which currency. A request for a
  currency none of the routing logic considered would silently go to
  whatever `action` maps to, regardless of whether that provider can
  actually process it.
- `toSubUnit()` / `fromSubUnit()` in `utils/helpers.js` hardcode a
  5-currency map (NGN, USD, GHS, KES, ZAR) with the same ×100 multiplier
  for all of them, and default anything unrecognized to ×100 too. This
  is only correct for Paystack. It is not applied to Korapay, JuicyWay,
  or Payscribe payloads at all currently (their `processPayment`
  methods pass `data.amount` straight through) — which is *probably*
  correct for Korapay per the findings above, but has not been verified
  one way or the other for JuicyWay or Payscribe.
- No request body validation on `POST /pay` beyond checking `amount`
  is truthy — no type check, no positivity check, no currency format
  check, no customer-object shape check.
- No idempotency protection — `generateReference()` always mints a
  fresh reference, so a client retry (e.g. a double-tap on mobile) can
  create two separate charges for what the user experienced as one
  action. Each provider's own reference-based idempotency only
  protects against *sending the exact same reference twice*, which
  this backend never does.
- No rate limiting anywhere.
- Provider error messages are passed back to the client close to
  verbatim (`error.message || 'Payment processing failed'`) — worth
  checking whether any provider ever includes anything sensitive
  (account details, internal error codes) in error responses that
  shouldn't reach the browser.

---

## Task queue

Do the first unchecked task, in order. Do not skip ahead unless a task
explicitly says its prerequisite isn't ready (e.g. Payscribe waiting on
docs).

### Task 1 — Fix or diagnose the Render build mismatch [x]
`render.yaml` builds with `npm run build` and starts `node
dist/index.js`; `package.json` has no `build` script and there's no
`dist/`. Figure out what's actually true: is this repo deployed via
`render.yaml` at all, or does Render's dashboard have a different,
manually-configured start command that overrides the file? If you
can't determine that from the repo alone, the safest fix is to make
`render.yaml` match reality — `buildCommand: npm install`,
`startCommand: node index.js` — since there's no compile step needed
for plain ESM JS. Don't add a real TypeScript build step as a side
effect of this task; that's out of scope here even though
`tsconfig.json` exists (flag it as a separate potential future task
instead, don't act on it).

**What was found / what changed:** Could not reach Render's dashboard
directly (no credentials, and the live URL isn't discoverable via
web_search to fetch its actual response), so went with the task's
own specified fallback rather than guess. Confirmed from the repo
itself: `package.json` has only `"start": "node index.js"` — no
`build` script at all — and there is no `dist/` directory anywhere in
the tree (`ls dist` → no such file). Also confirmed there are **no
TypeScript source files** (`find . -name "*.ts"` → empty) —
`tsconfig.json` is unused boilerplate (looks like an untouched
`tsc --init` output, still has its default commented-out options).
Since the app that's live at `b-pay-backend.onrender.com` (per the
project's own notes) is presumably actually running *something*, the
most likely real-world explanation is Render's dashboard has a
manually-configured start command that already overrides
`render.yaml` (Render lets dashboard settings win over the file when
both exist) — but that's an inference, not confirmed directly, since
dashboard access wasn't available this session. Fixed `render.yaml`
to match what the repo actually is either way: `buildCommand: npm
install`, `startCommand: node index.js`. This makes the file correct
and safe to use if/when the project ever does trigger a redeploy from
it (e.g. via "Clear build cache & deploy" or a fresh Render service),
without touching anything on the live dashboard. Did **not** add a
real TypeScript build step — flagging that as a legitimate future
task if the project ever wants `tsconfig.json` to do something real,
but out of scope here per the task's own instruction.
Verified with `node --check index.js` and `node --check routes.js`
(both pass — this task only touched `render.yaml`, a config file with
no syntax to check itself).

### Task 2 — Add a webhook route skeleton [x]
Add `POST /api/webhooks/:provider` to `routes.js`. For now this just
needs to: log the raw body + headers, route to a (not-yet-implemented)
per-provider handler stub that returns 200 immediately, and store
nothing yet — this task is purely the routing skeleton so Tasks 3–6
below can each independently plug in one provider's real signature
verification + handling without fighting over the same file. Express's
default JSON body parser (`express.json()`, already set up in
`index.js`) re-serializes the body — note in a comment that this could
be a problem for HMAC verification if a provider's signature is
computed over the *raw* bytes (Paystack's docs explicitly say raw
body), and flag that `express.json({ verify: (req, res, buf) => { req.rawBody = buf } })`
or similar may be needed — but don't implement that yet, just leave
the note for whichever task hits it first.

**What was found / what changed:** Added `POST /api/webhooks/:provider`
to `routes.js`, plus a `webhookHandlers` map with one stub per provider
(paystack/korapay/juicyway/payscribe), each just logging
`formatPayload(req.body)` and returning `{ received: true }` — no
signature verification or storage anywhere yet, on purpose, so Tasks
3–6 can each land independently. The route itself logs the full
headers object and the sanitized body before dispatching, returns 404
for an unrecognized `:provider` segment, and otherwise always
responds 200 (nothing to reject on until a task adds real
verification — once one does, an invalid signature should return 401
instead of falling through to this 200, noted inline as a comment).
Left the raw-body note as a comment above the handler map, per the
task's own instruction, rather than wiring up
`express.json({ verify })` now — that's for whichever of Tasks 3–6
needs true raw bytes first (almost certainly Task 3, Paystack, per the
findings section). Verified with `node --check routes.js` and
`node --check index.js` (both pass; `index.js` wasn't touched but
re-checked since it imports `routes.js`).

### Task 3 — Paystack webhook: signature verification + handling [ ]
Confirm the HMAC-SHA512 / `x-paystack-signature` scheme directly
against paystack.com/docs/payments/webhooks/ (already found via
primary source, per the findings section — this task is mostly
implementation, light re-verification). Implement it in the webhook
skeleton from Task 2, for the `paystack.success` (and relevant
failure) events. If Task 2's raw-body note turned out to matter, deal
with it here first since Paystack needs the true raw body.

### Task 4 — Korapay webhook: confirm signature scheme + implement [ ]
The `x-korapay-signature` / HMAC-SHA256 scheme in the findings section
above came from a secondary source — confirm it directly against
developers.korapay.com/docs/webhooks before implementing. Update the
"Confirmed research findings" section above to say "confirmed
directly" (with the exact primary URL) once you have, so future
sessions don't redo this. Then implement the handler.

### Task 5 — JuicyWay webhook: find the real scheme + implement [ ]
Nothing about JuicyWay's webhook signature scheme has been found yet
at all. Start at docs.juicyway.com, find their webhooks page, document
what you find in the "Confirmed research findings" section above, then
implement.

### Task 6 — Payscribe webhook: find the real scheme + implement [ ]
**Check PENDING_DOCS above first.** If no link has been provided yet,
skip this task (leave it unchecked) and move to the next one — don't
guess Payscribe's webhook scheme from general assumptions. If the link
is there, this is also the task that should replace
`Payscribe.verifyTransaction()`'s current behavior (it just throws
"requires Webhook or Bank Session ID" today) — once webhooks are
stored, `/api/verify` for Payscribe should look up the stored result
instead of always throwing.

### Task 7 — Korapay: confirm the amount-unit question directly [ ]
The findings section above has secondary evidence (decimal amounts in
docs examples) suggesting Korapay's `charges/initialize` wants base
units, not subunits — but this hasn't been confirmed against the exact
reference page for that specific endpoint. Open
developers.korapay.com's charges/initialize reference directly, find
an explicit statement or a clean non-ambiguous example, and update the
findings section to either confirm or correct this. If it turns out
subunits ARE required, fix `providers/korapay.js` to call
`toSubUnit()` (after also fixing Task 9 below, since the current
`toSubUnit()` map doesn't cover Korapay's full currency list).

### Task 8 — Paystack: verify endpoint paths + response shape against docs [ ]
Confirm `/transaction/initialize` and `/transaction/verify/:reference`
are exactly right (they were already believed correct going in, unlike
Korapay's paths which needed real fixes in a prior session — this is a
confirmation pass, not expected to find much, but do it properly
rather than skip it). Also confirm the response shape this repo
assumes (`responseData.status`, `.data.authorization_url` etc. if used
downstream) matches what Paystack actually returns.

### Task 9 — Expand currency/amount-unit handling per real provider capabilities [ ]
Depends on Tasks 3–8 having established real per-provider currency
lists and amount-unit rules. Rework `toSubUnit()`/`fromSubUnit()` in
`utils/helpers.js` so the unit conversion is applied **per provider**,
not blanket — e.g. a `getAmountFormat(provider, currency)` helper each
provider file calls, instead of one global assumption. Also expand the
currency list itself: don't hardcode a guessed "25 currencies" number
— pull the real, current country/currency list from the Mavins-web
repo (`src/lib/campaign/geoAffinity.ts`'s `TARGET_COUNTRIES`, and
`COUNTRY_CURRENCY` in `src/app/promote/page.tsx` — note these two
lists didn't even match each other as of the last Mavins-web session,
14 vs 20 entries respectively; reconciling that mismatch may itself
need to happen on the Mavins-web side, not here — just don't invent a
currency list here that doesn't correspond to something real on that
side).

### Task 10 — Currency/country/method-aware provider routing [ ]
Replace `ROUTING_RULES`'s abstract `action` string with real routing:
given a currency (and ideally a country code, if the caller has one),
pick a provider that actually supports it, per the findings above
(Paystack: NGN/GHS/ZAR/KES/USD only. Korapay: broader list, channel
varies by country — mobile money vs bank transfer vs card. Payscribe:
appears NGN-only based on its `.ng` sandbox domain — confirm, don't
assume. JuicyWay: check its real currency/country coverage once Task 5
research is done). If nothing supports a given currency, return a
clear 4xx error naming the currency, not a silent fallback to
`paystack` (today's default fallback, which would likely just fail
downstream with a confusing provider-side error instead of a clear
one).

### Task 11 — Request validation on POST /pay [ ]
Validate: `amount` is a positive number, `currency` is a 3-letter code
present in whatever the Task 9/10 currency tables end up being,
`customer.email` is present and looks like an email when the target
provider requires one (Paystack and Korapay do; check others).
Malformed requests should get a clear 400 with a specific message, not
fall through to a provider API call that fails confusingly. Keep this
dependency-free (no new npm package needed) unless the validation
logic gets unwieldy as plain JS — if so, `zod` is a reasonable, small
addition; note the choice either way in the commit message.

### Task 12 — Idempotency protection [ ]
This one needs a decision, not just code: this repo currently has no
persistence layer at all (no database). A real fix needs *somewhere*
to remember "we already processed reference X" across requests — that
might mean adding a lightweight store here (even a simple JSON file or
SQLite for a start), or it might mean this responsibility actually
belongs on the Mavins-web/Supabase side (which already has a database)
and this backend should just accept a client-supplied idempotency
key and pass it through to the provider where each provider's own API
supports one, without needing its own storage. **Don't build a database
layer without deciding this first** — if it's ambiguous, do the
smaller, in-scope half (accept and forward a client idempotency key
where providers support one) and leave a clear note in this file
under "Known issues" recommending the human decide the storage
question, rather than guessing at a bigger architecture change.

### Task 13 — Basic security hardening [ ]
Add rate limiting on `POST /api/pay` and `POST /api/webhooks/:provider`
(e.g. `express-rate-limit`, a small dependency). Review every
provider's error handling for anything that might leak upstream
details (API keys, internal codes, stack traces) into the client-facing
error message, and sanitize where needed.

### Task 14 — End-to-end manual test pass [ ]
Using each provider's sandbox/test keys, exercise `/api/pay` and
`/api/verify` (and by this point, the webhook handlers) for all four
providers. Write down what you tested and the result as a short
`TESTING.md` (or append to this file) — this is a manual pass, not an
automated test suite (no test framework is set up in this repo yet;
adding one is out of scope unless a future task specifically calls
for it). Confirm `/health`'s provider-key check reflects reality.

### Task 15 — Final audit pass before handoff to Mavins-web [ ]
Re-read all four provider files and `routes.js` end to end. Confirm
every `⚠️` / TODO-style comment from the original code has either been
resolved or turned into a tracked task above. Confirm the "Confirmed
research findings" section is fully up to date (no more "secondary
source, not yet confirmed" caveats left for anything that got used in
shipped code). This is the last B-PAY-backend-only task — Task 16
onward switches repos.

---

## Cross-repo continuation

**Important — all three repos in this project (B-Pay-backend,
Mavins-web, and Velune) each have their own `handover.md`.** When a
task below says to clone a different repo, that session's job is to:
(a) do the specific fix described, AND (b) update *that other repo's*
`handover.md` with what was done and what's left — so the next session
picks up the thread there, in that repo, using that repo's own patch
numbering and its own `git am` instructions (same process as this
file describes, just localized to that repo's clone path). Don't let
context about a still-open B-Pay-backend task get lost just because
work moved to another repo — leave a one-line pointer back here if a
Mavins-web or Velune task turns out to depend on something not yet
finished in this file.

### Task 16 — Clone Mavins-web, diagnose the Korapay amount bug [ ]
Clone `github.com/Zapier-codes/Mavins-web`. The reported symptom: "the
amount passed to Kora is not the correct amount." The most likely
cause, worth checking first: Mavins-web's pricing math
(`calculatePricing()` in `src/lib/campaign/pricing.ts`) works in
**cents** (`totalCostCents`, per `formatCents()` calls seen throughout
that codebase) — if the payment-initialize call site forwards
`totalCostCents` straight through as `amount` to this backend, and (per
Task 7's finding above) Korapay's `charges/initialize` wants the
**base currency unit** not subunits, the amount reaching Kora's
checkout could be 100x too large. **This is a hypothesis to verify
against the actual current code, not an assumption to act on
directly** — read `src/app/api/payments/initialize/route.ts` (or
wherever the current call site is; it may have moved) and trace the
exact value being sent before changing anything. Fix whatever the real
mismatch turns out to be. This task is diagnosis + fix; if the root
cause is more involved than a single unit-conversion bug, split further
into its own follow-up task in Mavins-web's `handover.md` rather than
trying to finish everything in one session.

### Task 17 — Mavins-web: skip fund-wallet/email step for already-authenticated users [ ]
The guest-checkout flow (guest pays without an account → account
auto-created → session issued, designed earlier in this project) is
for people who don't have an account yet, so it collects email as part
of payment. For a user who's **already logged in**, hitting
insufficient funds should skip straight to the payment provider's
checkout using the account's already-known email — not re-show the
"fund your wallet, enter your email" guest flow. Find where the
insufficient-funds → fund-wallet routing decision is made, branch it
on auth state, and route logged-in users directly to checkout
initialization instead.

### Task 18 — Mavins-web: reconcile the real country/currency list [ ]
`TARGET_COUNTRIES` (`src/lib/campaign/geoAffinity.ts`) and
`COUNTRY_CURRENCY` (`src/app/promote/page.tsx`) were 14 and 20 entries
respectively as of the last session touching this repo — they should
probably be the same list, or one should clearly be a superset with a
documented reason why. Reconcile them into a single source of truth
(however many countries/currencies that turns out to be — don't target
a specific number), and make sure whatever B-Pay-backend's Task 9
currency table ends up covering actually matches this list exactly on
both sides. This task may need its own follow-up in B-Pay-backend's
`handover.md` if the two repos' currency lists don't line up once this
is done — leave that note there if so.

### Task 19 — Mavins-web: route currency + payment method by geo [ ]
Use the existing `detectUserGeo` service (via ipapi.co, already present
in this codebase per an earlier session) to determine the user's
country, then: for African countries where Korapay supports
mobile-money/bank-transfer (per B-Pay-backend's confirmed findings —
check that file's current state, it may have grown since this note was
written), route the checkout amount + currency + preferred method
accordingly; for countries where none of the backend's providers has
local rails, fall back to USD via whichever provider/channel supports
USD. This depends on Task 18's reconciled currency list and on
B-Pay-backend's Task 10 (provider routing) being done first — check
both before starting.

### Task 20 — Mavins-web: no conversion/display for USD-default users [ ]
If the detected/selected currency is USD, don't show a converted
"local" amount anywhere (the app's own internal default is already
USD, so there's nothing to convert *from* for these users) — audit
wherever the "≈ local currency" display was added (e.g. the pricing
card's `localCurrency` prop, from earlier promote-page work) and make
sure it's conditionally skipped, not just showing "≈ $X USD" redundant
with the primary total.

### Task 21 — Mavins-web: update this repo's own handover.md [ ]
Once Tasks 16–20 (or however many of them got done) are complete,
update Mavins-web's own `handover.md` with what happened, any newly
discovered follow-up tasks, and continue that file's own existing task
queue (it already had unfinished tasks — Task 6 onward — before this
payment work started; don't lose track of those). This is the
carry-over step described at the top of this section.

### Task 22 — Clone Velune, investigate campaign placement display [ ]
Clone `github.com/Zapier-codes/Velune`. Per the project owner: a
campaign placement display **already exists** in this codebase but
**isn't wired correctly** to the intended approach. This first Velune
task is investigation-only — read the existing implementation, figure
out what "intended approach" it was supposed to follow (check for a
design doc, a comment trail, or ask the project owner if it's not
discoverable from the code itself), and write up findings as that
repo's own new `handover.md`, broken into small tasks the same way
this file is. Don't start implementing fixes in this same session —
investigation and implementation are two different tasks here, exactly
per this whole project's "one task per session" rule.

---

## Patches issued so far (keep this updated so numbering doesn't collide)

- `0001-webhook-route-skeleton.patch` — Task 2 (webhook routing
  skeleton, `routes.js`). Verified to apply cleanly with `git am`
  against `3811f7f` (Task 1's commit) and pass `node --check` on both
  touched/importing files, in a fresh `/tmp` clone, before handing
  off.
