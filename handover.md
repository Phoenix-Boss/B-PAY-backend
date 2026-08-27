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

## This is a 3-repo project — read this before "How every session works" below

This project spans **three separate GitHub repos**, each worked with
this exact same session-handover pattern, but each with **its own**
`handover.md`, its own task queue, and its own "Patches issued so far"
log — there is no single shared file. What ties the three together is
that any one repo's queue can contain a task whose real subject is a
*different* repo (always named explicitly in the task title, e.g.
"Task 17 — Mavins-web: skip fund-wallet/email step..." inside this
file). See "Sibling repos" below for the current list and each one's
push mechanics — they are NOT all identical (this repo uses a
fork→PR flow; confirm each other repo's own mechanics from its own
`handover.md` rather than assuming they match this one).

**The rule that changes your commands:** a task's code changes,
commits, patches, `git am`, and `git push` always happen in the repo
the task is actually *about* — never in whichever repo you currently
have cloned just because that's where you started reading. Concretely,
if you're working this file's queue and the first unchecked task in
order turns out to be a "Mavins-web: ..." or "Velune: ..." task:

1. **Stop making changes here.** Don't touch this repo's own source
   files for that task.
2. Clone (or `cd` into, if it's already cloned this session) the
   target repo — see its URL in "Sibling repos" below.
3. **Read that repo's own `handover.md` in full before doing anything
   else.** What's written about it here is a pointer/synopsis for
   continuity, not the source of truth — that repo's own file may have
   grown, split the task differently, or already have it done. Follow
   *that* file's own "How every session works" (or equivalent)
   section, since a different repo may have different steps (compare:
   this repo's fork→PR flow vs. Mavins-web's direct-push-no-PR flow,
   confirmed different as of this note).
4. Do the task, commit, format-patch, and verify **inside that repo's
   own working directory** (and its own fresh `/tmp` clone for the
   `git am` verification step) — not this one.
5. **The hand-off you give the human must say explicitly which local
   folder to be in**, since they're very likely still sitting in
   whichever repo's folder they last used — and note that a repo's
   local clone directory name doesn't always match the GitHub repo's
   own casing (confirmed this session: `Mavins-web` on GitHub is
   cloned locally as `mavins-web`, lowercase — check "Sibling repos"
   below for each repo's actual local folder name rather than assuming
   it matches the URL). Template:
   ```
   cd ~/<other-repo-local-folder>    # NOT this repo's folder, and NOT
                                      # necessarily the GitHub-repo casing
   git am ~/storage/downloads/NNNN-....patch
   git push origin main              # confirm against that repo's own
                                      # handover.md — B-Pay-backend and
                                      # Mavins-web both push directly
                                      # (one to a fork+PR, one straight
                                      # to main), don't assume every
                                      # repo does
   ```
6. Update **that repo's own** `handover.md` task queue and "Patches
   issued so far" log — not this file's — as part of the same commit,
   per that repo's own process.
7. If it makes sense for continuity, leave a short one-line pointer
   back in *this* file's own task entry noting what was found/done in
   the other repo (this file already does this in a few places — see
   "Cross-repo continuation" further down) — but the actual work
   record lives in the other repo's own file, not duplicated here.

**A session that's only told "clone repo X" should not assume the
whole queue lives inside repo X.** Read repo X's `handover.md` fully
first; if its first unchecked task is a cross-repo pointer, follow it
into the other repo per the steps above and treat this as one
continuous session working across two repos, rather than stopping and
asking the human to re-invoke you on the other repo. The "Sibling
repos" block immediately below exists specifically so a session that
starts in any one of the three repos can discover the other two exist
and jump on its own.

### Sibling repos (keep this block, or an equivalent, consistent across all three repos' own `handover.md` files)
- **`B-Pay-backend`** (this repo) —
  `https://github.com/Zapier-codes/B-Pay-backend` — fork of
  `https://github.com/Phoenix-Boss/B-PAY-backend`; changes go through
  the fork→PR flow described in "Pull request workflow" below (commit
  → patch → human `git am` + `git push origin main` → auto-joins the
  one open PR against upstream).
- **`Mavins-web`** — `https://github.com/Zapier-codes/Mavins-web` —
  confirmed **not** a fork (checked directly via the GitHub API this
  session: `fork: false`, no parent repo) — no PR step; the human runs
  `git am` **followed by `git push origin main`** directly against
  `main` (a direct push is the whole delivery there, not a step toward
  a PR — see that repo's own `handover.md` for the full write-up).
  **Local clone directory is `mavins-web`, lowercase** — not
  `Mavins-web` — even though the GitHub repo itself is capitalized;
  using the capitalized form for `cd` will fail with "not a git
  repository". (Correction added this session — an earlier pass
  through this file omitted the push step and used the GitHub-repo
  casing for the local folder; both are now fixed here and in
  Mavins-web's own copy of this block.)
- **`Velune`** — `https://github.com/Zapier-codes/Velune` — no
  `handover.md` exists there yet as of this note. This repo's own Task
  22 (see "Cross-repo continuation" below) is an investigation-only
  task whose job is to create Velune's first `handover.md` — whoever
  does that should copy this same "Sibling repos" block (with Velune's
  own push mechanics filled in once known) into the new file, so a
  session that starts in Velune can find its way back to the other two.

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
   exact branch pair). **This step's exact form assumes the task was
   B-Pay-backend's own — if the task actually belonged to Mavins-web or
   Velune, use that other repo's own hand-off form instead (its own
   `cd`, its own push mechanics, possibly no PR step at all — see "This
   is a 3-repo project" near the top of this file), not this one
   verbatim:**
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
see step 2 above):** As of this session (2026-08-27, the Task 10
partial-pass session), `origin/main` is 11 commits ahead of
`upstream/main` (`7b12a94` through `1fe8a34`, i.e. every commit from
the original PR-workflow-documentation pass through Task 9's partial
pass) — **confirmed still unmerged**, `upstream/main`'s latest is
still `900db65` (the earlier PR #1 merge, covering commits only
through `0616b8e`). The commit count in this paragraph had drifted
stale (a prior version of this note said "three commits" — that was
correct only as of whichever session wrote it; six more sessions'
worth of commits have joined PR #2 since without this paragraph being
kept current). Per the policy above, every new pushed commit keeps
joining this same PR #2 automatically; update this paragraph (don't
append a new one, and don't hardcode a commit count that will go stale
again — describe it relative to the hashes, as done here) each time a
session's step-2 check finds something has changed — new commits
added, or (eventually) merged.

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
- Webhook signature: **confirmed directly** against
  paystack.com/docs/payments/webhooks/ (fetched 2026-08-27). Header
  `x-paystack-signature`, value is a hex-encoded **HMAC-SHA512** of the
  event payload, keyed with the secret key. Important nuance found on
  direct read: Paystack's own official Node example computes the hash
  over `JSON.stringify(req.body)` — the body **after**
  `express.json()` has parsed and re-serialized it — not the raw
  request bytes. Task 2's speculative note (that Paystack needs true
  raw bytes) turned out to be an overcautious guess for this specific
  provider; implemented to match the primary source exactly
  (`providers/paystack.js#verifyWebhookSignature`), with a code
  comment flagging the re-serialization fragility this implies. No
  `express.json({ verify })` change was needed for Paystack.
  Also confirmed directly: there is **no dedicated "charge failed"
  event** in Paystack's supported-events list — `charge.success` is
  the only charge-related webhook; failures simply don't raise one.
  Full event list (for future reference): charge.dispute.create/
  remind/resolve, charge.success, customeridentification.failed/
  success, dedicatedaccount.assign.failed/success, invoice.create/
  payment_failed/update, paymentrequest.pending/success, refund.
  failed/pending/processed/processing, subscription.create/disable/
  expiring_cards/not_renew, transfer.failed/success/reversed.
  This repo now implements `POST /api/webhooks/paystack` (Task 3):
  verifies the signature (401 on failure/missing), logs
  `charge.success` transactions, and logs-only for every other event
  type (no persistence layer exists yet — see Task 12).

**Korapay**
- Charges/initialize endpoint (`POST /api/v1/charges/initialize`) —
  amount is in the **base currency unit**, NOT subunits. **Confirmed
  directly** (Task 7, 2026-08-27) against
  developers.korapay.com/docs/checkout-redirect, the guide that walks
  through this exact endpoint. That page's own parameter table lists
  `amount` as type `Integer` with no subunit/multiplier instruction
  anywhere on the page (contrast with Paystack, whose docs explicitly
  say "multiply the base amount by 100" — Korapay's page has no
  equivalent sentence, which is itself informative). Corroborating,
  consistent evidence across every other primary-source example found
  this session: the Checkout Standard widget doc's own JS examples use
  `amount: 22000` and `amount: 3000` for NGN test charges — sensible as
  ₦22,000/₦3,000, nonsensically small as kobo (₦220/₦30); the official
  Elixir client (`hexdocs.pm/kora_pay`) shows
  `KoraPay.create_charge(1000, "NGN", ...)` returning
  `"amount" => "1000.00"` — the two-decimal-place formatting on the
  *output* is a strong tell that `1000` on the *input* was already
  naira, not kobo; and the checkout-redirect webhook payload example
  itself shows `"amount": 100000, "fee": 1075` for an NGN transaction —
  a ~1.075% fee is a realistic real-world card/transfer fee rate at
  either scale, so it doesn't independently disambiguate, but it's
  consistent with (not contradicted by) the base-unit reading. No
  primary-source example anywhere multiplies a naira amount by 100
  before sending it. This repo's `providers/korapay.js` already passes
  `data.amount` straight through with no conversion (see
  `processPayment`) — **confirmed correct as-is, no code change
  needed** for this task. `toSubUnit()` should continue to NOT be
  applied to Korapay payloads (matches the pre-existing "Known issues"
  note above, now confirmed rather than assumed).
- Supported currencies (payout/collection, varies by product): NGN,
  GHS, KES, ZAR, USD, XAF, XOF, EGP, TZS. Payment method availability
  is country-specific — mobile money for KE/GH/CM/CI/EG/TZ, bank
  transfer/pay-with-bank for NG, EFT for ZA, card broadly. Source:
  developers.korapay.com/docs/accept-payments and
  developers.korapay.com/docs/payout-via-api (both primary/official).
- Webhook signature: **confirmed directly** against
  developers.korapay.com/docs/webhooks (fetched 2026-08-27). Header
  `x-korapay-signature`, value is a hex-encoded **HMAC-SHA256**.
  Important nuance found on direct read, different from Paystack: the
  hash is computed over **ONLY the `data` object**, not the full
  payload — Korapay's own official Node/PHP examples both hash
  `JSON.stringify(req.body.data)` / `json_encode($requestBody['data'])`,
  never the whole body. Verified numerically this session that a
  full-body hash and a data-only hash differ for the same payload, so
  this distinction is load-bearing, not cosmetic — hashing the whole
  body would silently reject every genuine webhook. Also confirmed:
  events are `transfer.success`/`transfer.failed`,
  `charge.success`/`charge.failed`, `refund.success`/`refund.failed`
  (six total, unlike Paystack which has no charge-failure event at
  all); `data` always includes `amount`, `fee`, `currency`, `status`
  (`success`/`failed`), `reference`, plus event-specific extras
  (`batch_reference` for bulk payouts, `payment_method` for pay-ins,
  `virtual_bank_account_details` for NG VBA pay-ins, etc). Korapay
  wants a `200` regardless of any response body content — "does not
  pay attention to any request parameters apart from the request
  status code" — and retries for up to 72 hours on anything else.
  This repo now implements `POST /api/webhooks/korapay` (Task 4):
  verifies the signature (401 on failure/missing), logs all six event
  types with reference/amount/currency/status (no persistence layer
  yet — see Task 12).
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
  `utils/helpers.js`) matches what docs.juicyway.com/home itself shows
  as its two `Development Environments` code samples — confirmed
  directly, this base URL was already correct.
- The existing `providers/juicyway.js` has an explicit
  `⚠️ Verify exact endpoint path in Juicyway docs` comment on the
  `/v1/charges` call — this is still unverified (out of scope for
  Task 5, which was webhooks-only; a future task should confirm the
  payment-initialization endpoint path the same way Task 7 does for
  Korapay).
- Webhook scheme: **confirmed directly** against
  docs.juicyway.com/webhooks.md (fetched 2026-08-27, via
  docs.juicyway.com/llms.txt's page index — the `/webhooks` path alone
  404s or isn't independently fetchable, use the `.md` suffix or go
  through llms.txt). Materially different from both Paystack's and
  Korapay's schemes, in three ways: (1) there is **no signature HTTP
  header at all** — the checksum travels *inside* the JSON body as a
  `checksum` field alongside `event`/`data`; (2) the HMAC key is the
  merchant's **"business ID"**, a separate credential from the secret
  API key used for REST calls — this repo has no env var for it yet,
  so `providers/juicyway.js` now reads `JUICYWAY_BUSINESS_ID` directly
  (not added to `getProviderKey()`'s public/secret map since it
  doesn't fit that shape); (3) the signed string is
  `${event}|${json_encoded_data}` where `data` must be JSON-encoded
  with **keys in alphabetical order at every nesting level** — the
  docs explicitly warn about this and show alphabetized nested example
  payloads. Plain `JSON.stringify()` does not do this (insertion order,
  not alphabetical), so a local `stableStringify()` helper was added
  to `providers/juicyway.js` to match. Notably, Juicyway's own Node.js
  doc example imports `json-stable-stringify` but then never calls it
  — it uses plain `JSON.stringify(data)` in the actual `validateSignature`
  code shown — which looks like a bug in their own sample; implemented
  to match the explicitly documented alphabetical-order requirement
  instead of that inconsistent sample. Digest is hex, **uppercase**:
  the docs' own sample checksum value is uppercase hex and the
  Python/Node examples both explicitly uppercase their digest, though
  the PHP example lowercases both sides before comparing instead (a
  cross-language inconsistency in Juicyway's own docs) — implemented
  as uppercase-with-tolerant-comparison (the incoming checksum is also
  uppercased before comparing), so a lowercase sender still verifies.
  Verified the whole scheme numerically this session with a throwaway
  script: valid checksum accepted, tampered data rejected, missing
  checksum rejected, wrong business-ID rejected, checksum is
  independent of the *sender's* top-level key order (since
  `stableStringify` re-sorts regardless), and a lowercase-hex checksum
  from a sender still verifies — all six passed, script deleted after.
  Only one documented event pair exists so far:
  `payment.session.succeeded` / `payment.session.failed`, both sharing
  one payload shape with `data.status` = `success`/`failed`. Docs also
  note **"In sandbox, successful transactions remain pending. Only
  failure events are sent"** — relevant for Task 14's manual test pass,
  since the success path can't be exercised via a real sandbox webhook.
  This repo now implements `POST /api/webhooks/juicyway` (Task 5):
  verifies the checksum (401 on failure/missing), logs both event
  types with reference/amount/currency/status (no persistence layer
  yet — see Task 12).

**Payscribe**
- **Waiting on a docs link from the project owner.** Check the
  "PENDING_DOCS" note right below this section before starting any
  Payscribe task — if the link still isn't there, skip to the next
  task in the queue rather than guessing from the existing code's
  `sandbox.payscribe.ng` URL alone.

**PENDING_DOCS:**
`<!-- paste the Payscribe docs link here when the project owner provides it -->`

---

## Project owner decisions (recorded verbatim from the owner — resolves previously open questions; read before touching reference/idempotency or anything wallet-related)

### Decision 1 — Reference generation + ownership, and who calls this backend (resolves the storage question Task 12 deliberately left open, see "Known issues" below)
**Correction from the project owner to this decision (see chat, this
supersedes the first version of this note):** the client app does **not**
call this backend directly. The actual flow: the app generates the
`reference` client-side at the moment payment is initiated (not shown to
the user) and writes it to Supabase. From that point on, the **Supabase
Edge Function is this backend's caller** — it is the edge function, not
the app, that calls this backend's `POST /pay` (passing that same
reference through), and it's the edge function that receives the
provider's webhook, matches it against the reference already sitting in
the Supabase table, and writes the result back to that table. So in
production this backend is called by Supabase infrastructure, not
directly by the mobile/web client.
This still settles Task 12's open question the same way as before: this
backend does **not** need its own idempotency store (SQLite/JSON file,
etc.) — that responsibility lives on the Supabase side, which already has
a database. This backend's role stays what Task 12's in-scope half
already built: accept whatever `reference` it's given, validate its
format, and forward it as-is to the provider. The only thing that changed
from this decision's first draft is **who** that caller is (the Supabase
Edge Function, not the app) — not what this backend itself does with the
reference.

### Decision 2 — Wallet crediting logic (Supabase/Mavins-web side, not this backend — noted here for continuity)
Once the Supabase Edge Function confirms a webhook, Supabase computes the
wallet-balance update: the user pays the full campaign amount *plus* the
platform fee up front; on confirmed receipt, the platform fee is deducted
and only the **remainder** is what shows as the user's wallet balance.
Whether anything is shown in the wallet at all depends on how the user
got there:
- **First-time users pay directly for a campaign** — there is no "top
  up wallet, then spend from wallet" step for a new user. All new users
  pay directly.
- **Only returning users top up a wallet balance** ahead of spending it
  on a future campaign.
- So: if a **new** user pays directly and the webhook is confirmed, they
  do **not** see a wallet balance change at all — they see a success
  screen only ("your campaign is live"), never a wallet number. Wallet
  balance display is a returning-user-only concept.

### Decision 3 — Post-payment success UI (frontend concern, Mavins-web — noted here for continuity)
On confirmed payment, both the paying user and admin (viewing the same
campaign) see the same success treatment: a success screen stating the
campaign is live, plus an animated workflow/pipeline visualization showing
interconnections to the countries the user selected for the campaign,
radiating out from a central "hub" node. This is a shared user/admin view,
not two different screens.

**Where this belongs:** Decisions 2 and 3 are Supabase/Mavins-web
concerns, not B-Pay-backend concerns — this backend only initiates charges
with a provider, it doesn't own wallet balances or the post-payment UI.
Recorded here anyway per the project owner's request so no session
(in this repo or Mavins-web) re-asks or re-derives it. Per this file's own
"Cross-repo continuation" pattern (see below), whichever session next
touches Mavins-web should copy Decisions 2 and 3 into that repo's own
`handover.md` and open real implementation tasks there — this file isn't
the place to design that UI/wallet code, just to preserve the decision.

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
  methods pass `data.amount` straight through) — **confirmed correct
  for Korapay** as of Task 7 (base currency units, not subunits), but
  still not verified one way or the other for JuicyWay or Payscribe.
- ~~No request body validation on `POST /pay` beyond checking `amount`
  is truthy — no type check, no positivity check, no currency format
  check, no customer-object shape check.~~ **Resolved by Task 11** —
  see that task's note for what's actually validated now
  (amount/currency format/customer.email where the resolved provider
  requires it).
- No idempotency protection when the client doesn't supply their own
  `reference` — `generateReference()` mints a fresh one on every call
  in that case, so a client retry (e.g. a double-tap on mobile, with
  no client-side reference of its own) can still create two separate
  charges for what the user experienced as one action. **RESOLVED by
  the project owner — see "Project owner decisions" → Decision 1
  above:** the app generates the reference client-side and stores it in
  Supabase; a **Supabase Edge Function** — not the app directly — is
  this backend's actual caller, forwarding that same reference through
  when it calls `POST /pay`, and that same edge function is also where
  webhook receipt of record and reconciliation happen. This backend
  does not build its own idempotency store — it only validates and
  forwards whatever `reference` it's given (already done, Task 12). In
  practice this means this backend's real-world caller (the edge
  function) is now expected to always supply a client-originated
  reference rather than rely on this backend's fallback
  `generateReference()`, so the true no-reference-supplied double-charge
  case above should mostly stop occurring once the edge function is
  built to match Decision 1 — see the new Task 23 below.
- No rate limiting anywhere. **Still open** — Task 13's error-handling
  pass (below) deliberately did not touch this; it needs its own
  session.
- ~~Provider error messages are passed back to the client close to
  verbatim...~~ **Addressed by Task 13's error-handling-review half**:
  provider-authored messages (meant for the end user) are now
  explicitly flagged safe-to-pass-through via `providerError()`
  (`utils/helpers.js` + all four provider files); everything else
  (network failures, missing API keys/base URLs) gets a generic
  client-facing message while the real detail stays in the server log.
  See Task 13's own note for the full write-up.

---

## Current focus: Korapay only (as of 2026-08-27)

**Project owner direction: narrow scope to Korapay for now.** We are
still waiting on API keys from Paystack, JuicyWay, and Payscribe, so
there is no way to test or verify anything beyond what's already
committed for those three providers. Until those keys arrive:

- **Do** keep working the queue for any task that is Korapay-specific
  (currently: Task 7).
- **Don't** start Task 6 (Payscribe — already blocked on docs anyway),
  Task 8 (Paystack endpoint verification), or the Paystack/JuicyWay/
  Payscribe portions of any multi-provider task (9, 10, 11, 12, 13) —
  leave their checkboxes unchecked and skip over them.
- Multi-provider tasks (9, 10, 11, 12, 13) that don't strictly require
  the other three providers' credentials may still get a **Korapay-only
  partial pass** if a session finds a clean way to scope the work that
  way (e.g. Task 9's `getAmountFormat(provider, currency)` shape could
  be designed generically and filled in for Korapay alone, leaving the
  other three providers' entries as explicit TODOs rather than guesses)
  — but don't force it if the task doesn't split cleanly; when in
  doubt, skip and leave a one-line note here instead of half-finishing
  a task that needs all four providers to make sense.
- This is a temporary narrowing, not a permanent re-scoping of the
  project — once API keys for the other providers arrive, remove this
  section (or mark it resolved) and resume the full queue in order,
  starting from whatever's still unchecked.

---

## Task queue

Do the first unchecked task, in order, **except while the "Current
focus: Korapay only" section above is active — then do the first
unchecked Korapay-specific task instead**, skipping non-Korapay tasks
that need credentials we don't have yet. Do not skip ahead for any
other reason unless a task explicitly says its prerequisite isn't ready
(e.g. Payscribe waiting on docs).

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

### Task 3 — Paystack webhook: signature verification + handling [x]
Confirm the HMAC-SHA512 / `x-paystack-signature` scheme directly
against paystack.com/docs/payments/webhooks/ (already found via
primary source, per the findings section — this task is mostly
implementation, light re-verification). Implement it in the webhook
skeleton from Task 2, for the `paystack.success` (and relevant
failure) events. If Task 2's raw-body note turned out to matter, deal
with it here first since Paystack needs the true raw body.

**What was found / what changed:** Re-confirmed the scheme directly by
fetching paystack.com/docs/payments/webhooks/ rather than trusting the
earlier secondary-source note. Two things changed from what Task 2
assumed: (1) Paystack's own official example hashes
`JSON.stringify(req.body)`, not raw request bytes, so the raw-body
middleware flagged in Task 2 was **not** needed here — the
`express.json()` parse-then-reserialize round-trip is what Paystack's
own docs use — this is now the confirmed behavior for Paystack
specifically, not necessarily for the other three providers (Task 4-6
should each check independently, don't assume the same holds). (2)
The event name is `charge.success` (not `paystack.success` as this
task's own title text guessed) and there's no dedicated charge-failure
event in Paystack's list at all — failures just don't raise a webhook.
Implemented `verifyWebhookSignature(body, signature)` on the `Paystack`
class in `providers/paystack.js` (HMAC-SHA512 keyed with the secret
key, constant-time compare via `crypto.timingSafeEqual`, returns
`false` — not a throw — on missing signature or length mismatch so the
route can decide the HTTP response). Wired it into the `paystack`
webhook handler in `routes.js`: invalid/missing signature now throws
an error carrying `statusCode = 401`, which the route's catch block
(also updated to respect `error.statusCode` instead of hardcoding 500)
turns into a real `401` response instead of the previous unconditional
`200`. On a verified `charge.success`, logs reference/amount/status;
every other verified event type is logged generically since there's no
persistence layer yet (Task 12) and no other event needs action yet.
Updated the findings section above to "confirmed directly" with the
exact primary URL and fetch date, plus the full current event list for
future reference. Verified: `node --check routes.js` and
`node --check providers/paystack.js` both pass; also wrote a throwaway
`node -e` script exercising the HMAC logic against four cases (valid
signature accepted, tampered signature rejected, missing signature
rejected, wrong secret rejected) — all four passed — then deleted the
script per the process doc's instruction not to commit scratch files.

### Task 4 — Korapay webhook: confirm signature scheme + implement [x]
The `x-korapay-signature` / HMAC-SHA256 scheme in the findings section
above came from a secondary source — confirm it directly against
developers.korapay.com/docs/webhooks before implementing. Update the
"Confirmed research findings" section above to say "confirmed
directly" (with the exact primary URL) once you have, so future
sessions don't redo this. Then implement the handler.

**What was found / what changed:** Fetched
developers.korapay.com/docs/webhooks directly. The secondary-source
note was right about the algorithm (HMAC-SHA256) but incomplete on
scope: Korapay signs **only the `data` object**, not the full request
body — different from Paystack's Task 3 implementation, which signs
the whole body. Confirmed this distinction is load-bearing (not just
a documentation nuance) by hashing the same sample payload both ways
in a throwaway script and getting different hashes — a naive
full-body implementation copied from the Paystack pattern would have
silently rejected every real Korapay webhook. Implemented
`verifyWebhookSignature(body, signature)` on the `Korapay` class in
`providers/korapay.js`, hashing `JSON.stringify(body?.data)` (mirrors
Korapay's own official Node/PHP examples exactly), same
constant-time-compare pattern as Paystack's Task 3 implementation.
Wired it into the `korapay` webhook handler in `routes.js`: same
401-on-invalid-signature behavior as Paystack. On any of the six
confirmed event types (`charge.success`/`charge.failed`,
`transfer.success`/`transfer.failed`, `refund.success`/
`refund.failed`), logs reference/amount/currency/status; anything else
is logged generically. Updated the findings section above to
"confirmed directly" with the fetch date, the full event list, the
`data` object's documented fields, and the retry/response-code
behavior (always wants a `200`, retries up to 72h otherwise) for
future reference. Also confirmed the raw-body concern from Task 2
doesn't apply to Korapay either — its own official examples
re-serialize the parsed body just like Paystack's do. Verified:
`node --check routes.js` and `node --check providers/korapay.js` both
pass; a throwaway `node -e` script exercised valid/tampered/missing/
wrong-secret cases (all four correct) plus the full-body-vs-data-only
hash comparison — deleted after use, not committed.

### Task 5 — JuicyWay webhook: find the real scheme + implement [x]
Nothing about JuicyWay's webhook signature scheme has been found yet
at all. Start at docs.juicyway.com, find their webhooks page, document
what you find in the "Confirmed research findings" section above, then
implement.

**What was found / what changed:** Fetched
docs.juicyway.com/webhooks.md directly (found via
docs.juicyway.com/llms.txt's page index, since the bare `/webhooks`
path wasn't independently fetchable). Full scheme write-up is in the
"Confirmed research findings" section above — short version: no
signature header (checksum is a body field), HMAC key is a "business
ID" not the API secret, signed string is `event|alphabetically-sorted-
JSON(data)`, digest is uppercase hex. Implemented
`verifyWebhookSignature(payload)` on the `Juicyway` class in
`providers/juicyway.js` (takes the whole parsed body, not a header,
since the checksum lives inside it), plus a local `stableStringify()`
helper in the same file to produce the required alphabetical-key JSON
encoding. Added `this.businessId = process.env.JUICYWAY_BUSINESS_ID`
in the constructor — **this is a new required env var not previously
in this repo**; it is not the same as `JUICYWAY_API_KEY`/
`JUICYWAY_PUBLIC_KEY` and needs to be set wherever this app is
deployed for Juicyway webhook verification to work at all (currently
unset, `verifyWebhookSignature` will reject everything until it's
configured — flagging this plainly since it's a real deployment
prerequisite, not just a code change). Wired it into the `juicyway`
webhook handler in `routes.js`: same 401-on-invalid-checksum pattern
as Paystack/Korapay. On either of the two documented event types
(`payment.session.succeeded`/`payment.session.failed`), logs
reference/amount/currency/status; anything else is logged generically
(no persistence layer yet — Task 12). Updated the two stale routes.js
comments (above `webhookHandlers` and above the `/api/webhooks/:provider`
route) that still described Juicyway as an unverified stub. Left the
existing `⚠️ Verify exact endpoint path in Juicyway docs` comment on
`processPayment`'s `/v1/charges` call alone — that's a payment-init
endpoint question, not a webhook one, out of scope for this task (now
noted as a explicit future task in the findings section instead of
being silently left dangling). Verified: `node --check routes.js` and
`node --check providers/juicyway.js` both pass; a throwaway `node`
script exercised valid/tampered/missing-checksum/wrong-business-id
cases, sender key-order independence, and lowercase-checksum tolerance
(all six correct) — deleted after use, not committed. Pushed as part
of PR #2, **not yet merged by Phoenix-Boss** (see "Outstanding PRs
status" above — check it's still current as of whichever session reads
this next).

### Task 6 — Payscribe webhook: find the real scheme + implement [ ]
**On hold — see "Current focus: Korapay only" above.** Doubly blocked
right now: still no PENDING_DOCS link, *and* we're waiting on API keys
from Payscribe regardless, so there'd be nothing to test against even
with docs in hand. **Check PENDING_DOCS above first** once the focus
narrowing is lifted. If no link has been provided yet, skip this task
(leave it unchecked) and move to the next one — don't guess Payscribe's
webhook scheme from general assumptions. If the link is there, this is
also the task that should replace `Payscribe.verifyTransaction()`'s
current behavior (it just throws "requires Webhook or Bank Session ID"
today) — once webhooks are stored, `/api/verify` for Payscribe should
look up the stored result instead of always throwing.

### Task 7 — Korapay: confirm the amount-unit question directly [x]
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

**What was found / what changed:** Fetched
developers.korapay.com/docs/checkout-redirect directly — this is the
guide that documents the `charges/initialize` endpoint end to end,
including its full parameter table. The `amount` parameter is typed
`Integer` with no subunit/multiplier instruction anywhere on the page,
unlike Paystack's docs which explicitly say to multiply by 100.
Cross-checked against three more primary/near-primary sources (Checkout
Standard widget's `amount: 22000`/`amount: 3000` NGN examples, the
official Elixir client's `"amount" => "1000.00"` decimal-formatted
output, and the checkout-redirect page's own webhook payload example)
— all consistent with base currency units, none suggesting kobo. Base
units is now **confirmed directly**, not secondary-source inference.
No code change was needed: `providers/korapay.js#processPayment`
already forwards `data.amount` unconverted, which is the correct
behavior. Updated the "Confirmed research findings" Korapay section
above with full source detail so a future session doesn't need to
re-derive this. Verified with `node --check providers/korapay.js` (no
code touched, but re-checked since the task could have required a
change). Per the "Current focus: Korapay only" note above, this was
the one task worked this session — no other provider's task was
started.

### Task 8 — Paystack: verify endpoint paths + response shape against docs [ ]
**On hold — see "Current focus: Korapay only" above.** We're waiting
on API keys from Paystack, so even a confirmed-correct endpoint/shape
can't actually be exercised end-to-end right now; revisit once keys
arrive. (Doc research alone doesn't need a key, so a future session
could still do the read-only confirmation half if useful — but per the
current focus narrowing, skip this task entirely for now rather than
partially doing it.)
Confirm `/transaction/initialize` and `/transaction/verify/:reference`
are exactly right (they were already believed correct going in, unlike
Korapay's paths which needed real fixes in a prior session — this is a
confirmation pass, not expected to find much, but do it properly
rather than skip it). Also confirm the response shape this repo
assumes (`responseData.status`, `.data.authorization_url` etc. if used
downstream) matches what Paystack actually returns.

### Task 8b — Juicyway: verify the payment-initialization endpoint path [ ]
**Added by Task 15's audit pass** (see that task's note) — `providers/juicyway.js`
has carried an explicit `⚠️ Verify exact endpoint path in Juicyway docs`
comment on its `/v1/charges` call since Task 5 (which was webhooks-only
in scope), and the "Confirmed research findings" section has flagged
this as unverified since then too — but nothing had actually turned it
into a queued task until now, so it was sitting unresolved and
untracked. Same shape of work as Task 7 (Korapay) and Task 8
(Paystack): open docs.juicyway.com (via its `.md` suffix / `llms.txt`
page index — see the JuicyWay findings section above for why the bare
`/webhooks` path itself 404s, likely the same trick needed for the
charges endpoint) and confirm the real payment-initialization path,
required/optional fields, and response shape against the primary
source, then fix `providers/juicyway.js` if `/v1/charges` turns out to
be wrong (same class of fix Task 7 made for Korapay's paths).
**On hold — see "Current focus: Korapay only" above**, same reasoning
as Task 8: we're waiting on JuicyWay API keys regardless, so even a
confirmed-correct path can't be exercised end-to-end yet. Doc research
alone doesn't need a key, but per the current focus narrowing, skip
this entirely for now rather than partially doing it — matches how
Task 8 itself is being held.

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

**Partial progress this session (Korapay-only focus, box left
unchecked — task split, see below):** Implemented the
`getAmountFormat(provider, currency)` helper design exactly as this
task describes, plus a `convertAmountForProvider(amount, provider,
currency)` wrapper, both in `utils/helpers.js`. Filled in real rules
for the two providers with confirmed research: **Paystack** (subunit,
×100, 5-currency list — this was already confirmed pre-existing
research, not new this session) and **Korapay** (base unit, no
multiplier, 9-currency list — confirmed this session via Task 7).
**JuicyWay and Payscribe intentionally throw** a clear "not yet
confirmed" error instead of guessing a multiplier — per this project's
"Current focus: Korapay only" note above, their amount-unit rules
haven't been separately verified and we don't have working keys to
test against even if we guessed right. Rewired `providers/paystack.js`
(now calls `convertAmountForProvider` instead of the old direct
`toSubUnit` call) and `providers/korapay.js` (now explicitly calls
`convertAmountForProvider` too — a confirmed no-op, but it makes the
Task 7 rule enforced in code, not just documented in a comment) —
`providers/juicyway.js` and `providers/payscribe.js` were **not**
touched, since routing their existing `data.amount` pass-through
through the new helper would just throw for both of them right now,
which would be a regression, not an improvement, until Task 6/8-style
confirmation happens for each. Left the old `toSubUnit()`/
`fromSubUnit()` functions in place (unused by any provider file now,
but not deleted — a future session can remove them once nothing else
might reasonably want the raw ×100 utility, or repurpose them inside
`getAmountFormat`'s own subunit case). Verified: `node --check` on all
three touched files, plus a throwaway sanity script (deleted after)
exercising Paystack/Korapay conversion math, the JuicyWay/Payscribe/
unknown-provider throw paths, and `getAmountFormat`'s return shape —
all passed.
**Why the box stays unchecked:** the currency-list-expansion half of
this task (pulling the real list from Mavins-web) was **not**
attempted — split out explicitly into the new **Task 9b** immediately
below, per this project's own "split a task, don't half-finish it
silently" rule. **A future session that reaches this unchecked box
should skip straight to Task 9b rather than redoing the
`getAmountFormat`/`convertAmountForProvider` work above** — that part
is done. Task 9's own box should probably be considered done in spirit
for the two providers we can currently test, but stays unchecked until
either (a) JuicyWay/Payscribe get their own confirmed rules and the
helper covers all four providers, or (b) the project owner decides the
currency-list-expansion clause doesn't actually block calling it
complete — that's a scope call for the project owner, not this
session, to make.

### Task 9b — Pull the real currency list into `getAmountFormat` from Mavins-web [ ]
Split off from Task 9 above (see its note) rather than left half-done
in the same task. Depends on **Mavins-web's currency-list
reconciliation** (this file's own Task 18, under "Cross-repo
continuation" below — confusingly *not* a task with that number inside
Mavins-web's own `handover.md`, which has an unrelated Task 18; see
that entry's "Status check" note for the correction) being done first —
check that entry's current state before starting this one; if it isn't
done yet, this task isn't ready either, skip it same as any other
blocked task.

**Checked this session — still blocked, box stays unchecked:** went to
start this task, which meant checking on the reconciliation work it
depends on first (per its own instruction above). Cloned Mavins-web and
confirmed directly that the reconciliation has **not** happened —
`TARGET_COUNTRIES` is now 25 entries (grown via Mavins-web's own Task
23, a different task) but `COUNTRY_CURRENCY` is still the old 20-entry
list, and the two now overlap on only 12 codes. Full detail moved to
this file's Task 18 entry below (under "Cross-repo continuation") rather
than duplicated here, including the finding that Task 18 was never
actually added to Mavins-web's own task queue, so nothing is currently
set up to pick it up. No code touched this session — this was a
dependency check, not an implementation attempt, per the task's own
"skip it same as any other blocked task" instruction. Once there's a
single reconciled country/currency list on the Mavins-web side, replace
the hardcoded `supported` arrays inside `getAmountFormat`'s Paystack/
Korapay cases (and whichever of JuicyWay/Payscribe have confirmed rules
by then, if any) in `utils/helpers.js` with values derived from — or at
minimum cross-checked against — that real list, so this file stops
hardcoding a currency list Mavins-web disagrees with. If a currency
shows up on Mavins-web's list that a provider's own docs don't support,
that's a real gap to flag back to the project owner, not something to
silently paper over here.

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

**Partial progress this session (Korapay-only focus, box left
unchecked — same pattern as Task 9's partial):** `ROUTING_RULES` itself
is still untouched — a full currency-aware provider *selection* across
all four providers needs all four to have a confirmed currency list
first, and JuicyWay/Payscribe don't yet (same blocker Task 9 hit).
What this session added instead: `getSupportedCurrencies(provider)` in
`utils/helpers.js` (extracted from the currency arrays that were
already inline inside `getAmountFormat`'s Paystack/Korapay cases —
`getAmountFormat` now calls it too, so there's one list per provider,
not two copies that could drift apart), and a new
`assertCurrencySupported(providerName, currency)` in `routes.js`,
called in `POST /pay` right after a provider is resolved (whether via
explicit `provider` or via `action` → `ROUTING_RULES`) and before
`getProvider()`/`processPayment()` are ever reached. For Paystack and
Korapay (the two providers with a confirmed list), a currency outside
that list now gets a clear `400` naming both the currency and the
provider, instead of being forwarded to reach the provider's API and
fail there with a less obvious error (or, worse, silently going
through if the provider's API doesn't itself reject it). For JuicyWay
and Payscribe, `getSupportedCurrencies()` returns `null` and
`assertCurrencySupported` treats that as "can't validate yet" and lets
the request through unchanged — same behavior as before this task,
not a regression, per the same "don't guess" principle Task 9 applied
to their amount-unit rules. Also fixed a real, previously-unrelated bug
found while wiring this in: `POST /pay`'s `catch` block always
answered `500` regardless of `error.statusCode` — unlike the
`/webhooks/:provider` route, which has respected `error.statusCode`
since Task 3. That meant this task's new 400 would have silently come
back as a 500 without this fix, so it's included in the same commit
rather than filed separately. Verified: `node --check routes.js` and
`node --check utils/helpers.js` both pass; a throwaway `node -e` script
(deleted after) exercised `getSupportedCurrencies` for all four
providers (correct lists for Paystack/Korapay, `null` for the other
two) and `assertCurrencySupported` against six cases — Korapay+NGN
(pass), Korapay+CAD (400), Paystack+GHS (pass), Paystack+XOF (400),
JuicyWay+anything (pass-through), Payscribe+anything (pass-through) —
all six matched expectation.
**Why the box stays unchecked:** `ROUTING_RULES`'s actual provider-
*selection* logic (as opposed to this session's after-the-fact
validation of whatever it already picked) is still the abstract
4-action map from before — the real "pick a provider given a
currency+country" rework this task describes needs JuicyWay and
Payscribe's currency lists confirmed first (JuicyWay: no task has
checked this yet; Payscribe: blocked on PENDING_DOCS, see above), so a
future session should pick this up once "Current focus: Korapay only"
is lifted, not treat this partial pass as the finished task.

### Task 11 — Request validation on POST /pay [x]
Validate: `amount` is a positive number, `currency` is a 3-letter code
present in whatever the Task 9/10 currency tables end up being,
`customer.email` is present and looks like an email when the target
provider requires one (Paystack and Korapay do; check others).
Malformed requests should get a clear 400 with a specific message, not
fall through to a provider API call that fails confusingly. Keep this
dependency-free (no new npm package needed) unless the validation
logic gets unwieldy as plain JS — if so, `zod` is a reasonable, small
addition; note the choice either way in the commit message.

**What was found / what changed:** Kept this dependency-free — plain
regex/type checks, no `zod` needed, the logic stayed small. Added
three new checks to `utils/helpers.js`: `isValidCurrencyCode()`
(3-letter format, case-insensitive), `isValidEmail()` (basic
`x@y.z`-shape check, not a full RFC 5322 validator — good enough to
catch typos/empty strings without being its own project), and
`providerRequiresEmail()`. That last one required reading all four
providers' `processPayment()` call sites directly rather than assuming
just Paystack/Korapay per the task's own hint text: **JuicyWay also
requires email** (forwards `data.customer?.email` with no fallback,
same shape as Paystack) — this wasn't previously called out anywhere
in the findings section, so it's new information from this task, not
just implementation. **Payscribe does NOT require it** at this
layer — its `processPayment()` already defaults to a placeholder
`'customer@example.com'` when none is given, so enforcing a real email
for Payscribe here would be inventing a stricter requirement than the
code actually has (flagging Payscribe silently accepting a fake email
as its own separate, pre-existing concern — not fixed as part of this
task, since that's a Payscribe-provider-file change, not a
request-validation one).
In `routes.js`: `assertValidAmount()` (rejects non-number, non-finite,
zero, and negative — the old `if (!amount)` check let a numeric-string
`"100"` or `NaN` through silently) and `assertValidCurrencyFormat()`
(shape-only 3-letter check, run for every request regardless of
provider) both run immediately after logging the incoming request,
before any provider routing happens. `assertValidCustomerEmail()` runs
right after `assertCurrencySupported` (Task 10), once `providerName`
is known, since whether email is required depends on which provider
got picked. All three throw an `Error` with `.statusCode = 400` and a
specific message naming the bad field and what was received — caught
by the same `error.statusCode || 500` catch-block fix Task 10 already
made, so these come back as real 400s, not 500s.
Deliberately NOT done here (would be scope creep / a different task):
cross-checking `currency` against the *resolved provider's* actual
supported list — that's already `assertCurrencySupported`'s job
(Task 10); this task's currency check is shape-only ("does it look
like a real code"), not a whitelist check, per the task's own
"present in whatever the Task 9/10 currency tables end up being"
framing, which reads as "consistent with those tables' format," not
"re-implement the same lookup twice."
Verified: `node --check routes.js` and `node --check utils/helpers.js`
both pass. A throwaway `node -e` script (deleted after use) exercised
`isValidCurrencyCode` (9 cases: valid/lowercase/word/numeric/empty/
undefined/valid/2-letter/4-letter — all correct), `isValidEmail` (6
cases: valid/invalid/empty/undefined/missing-TLD/valid-with-subdomain —
all correct), `providerRequiresEmail` for all four providers (correct
per the note above), and `assertValidAmount`'s logic standalone (7
cases: valid/zero/negative/numeric-string/NaN/Infinity/small-decimal —
all correct).

### Task 12 — Idempotency protection [x]
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

**What was found / what changed:** Did the smaller, in-scope half only,
per the task's own instruction — the storage decision (own DB here vs.
Mavins-web/Supabase side vs. accept-and-forward-only) is a real
architecture call for the project owner, not something to guess at, so
it's left open below rather than acted on. What this session confirmed
and built: `POST /pay` already destructured a client-supplied
`reference` from the request body and forwarded it as-is
(`ref = reference || generateReference(providerName)`) — so
accept-and-forward already existed structurally before this task; what
it was missing was any validation of that client-supplied value before
forwarding it. Added `assertValidReferenceFormat(providerName,
reference)` to `routes.js`: if the client omits `reference` entirely,
this is a no-op (the existing `generateReference()` fallback already
produces something safe). If they supply one, it must be a non-empty
string, and — for Paystack specifically — must match the character set
its own docs require (confirmed directly against
paystack.com/docs/api/errors/transaction/: "Only -,.,= and
alphanumeric characters are allowed"); a client-supplied reference with
e.g. a `#` or space in it now gets a clear 400 naming the bad character
instead of reaching Paystack and failing there with its own less
specific error. Korapay's own primary docs
(developers.korapay.com/docs/checkout-redirect) only state the
reference "Must be unique for every transaction" — no character
restriction — so no charset check is applied for Korapay beyond
non-empty-string; JuicyWay/Payscribe: same (no format research done
this session, out of the current Korapay-focus scope).
**Important correction to a claim NOT in this file before:** while
researching this, a secondary source (a third-party "skills" listing
aggregating Korapay's API, not developers.korapay.com itself) claimed
Korapay's reference is "idempotent" in the strong sense — that
resending the same reference "returns the original charge" (a cached
result, no error). This was checked directly against Korapay's own
primary docs this session and is **NOT confirmed there** — the
primary source only states the *uniqueness requirement*, worded
almost identically to Paystack's (which is documented, also via a
primary source, to reject a reused reference outright with a
"Duplicate Transaction Reference" error, not return a cached result).
Recording this here so a future session doesn't accidentally treat
the unconfirmed secondary claim as fact: **the safer, primary-source-
backed assumption is that both Paystack and Korapay reject a reused
reference as an error**, not that either silently returns a cached
prior result. If a future task actually needs true idempotent-replay
semantics (client retries the exact same request and gets the exact
same response back, no error), that requires the storage layer this
task explicitly declined to build — see the "Known issues" note below.
Verified: `node --check routes.js` and `node --check utils/helpers.js`
(routes.js was the only file touched, but `utils/helpers.js` was
re-checked since it's imported). A throwaway `node -e` script (deleted
after use) exercised `assertValidReferenceFormat` against 8 cases
(omitted reference / valid Paystack reference / invalid-character
Paystack reference / empty string / non-string / Korapay with
special characters allowed through / Korapay empty string rejected /
JuicyWay pass-through) — all eight matched expectation.
**(Originally left unchecked pending the storage/architecture decision
below — resolved and box now checked, see this session's note
immediately after.)**

**Update — decision received, see "Project owner decisions" → Decision
1 near the top of this file:** the owner picked option (b) — reference
storage and idempotency live on the Supabase side via an Edge Function,
not in this backend. This task's in-scope half (validate + forward a
client-supplied reference) already matches that decision and needs no
further code change here. What's now unblocked is a *new* task — Task
23 below — to confirm every caller actually sends its own reference
going forward, since the decision assumes that, rather than leaning on
this backend's own `generateReference()` fallback.

**This session (2026-08-27):** picked this up as the next actionable
item in queue order — Tasks 6 and 8 are explicitly on hold, Task 9's
own note says to skip straight to 9b, 9b is confirmed still blocked on
Mavins-web's currency-list reconciliation, and Task 10's remaining
`ROUTING_RULES` rework needs JuicyWay/Payscribe currency lists this
backend doesn't have yet — none of that left anything actually
actionable ahead of this task. Re-read `routes.js` directly (not just
this file's prior notes) to confirm the two paragraphs above weren't
just stale prose: `assertValidReferenceFormat(providerName, reference)`
is present and wired into `POST /pay` exactly as described (no-op on
omitted reference, non-empty-string check, Paystack charset check),
matching Decision 1's resolution with nothing left to build here. The
two paragraphs directly above had been left contradicting each other —
one said the box stays unchecked pending a decision, the next said the
decision arrived and needs no further code — so this was a stale
bookkeeping gap, not an actual open task. No source file changed this
session; only this file (checkbox + the note you're reading). Per this
project's own rule, non-code (docs-only) sessions still get their own
commit and patch — see `0012` in "Patches issued so far" below.

### Task 13 — Basic security hardening [ ]
Add rate limiting on `POST /api/pay` and `POST /api/webhooks/:provider`
(e.g. `express-rate-limit`, a small dependency). Review every
provider's error handling for anything that might leak upstream
details (API keys, internal codes, stack traces) into the client-facing
error message, and sanitize where needed.

**Partial progress this session (rate limiting explicitly descoped —
project owner instruction, not a session decision — box stays
unchecked, see below):** Did the error-handling-review half only.
Read every provider file's `processPayment()`/`verifyTransaction()`
plus `routes.js`'s three catch blocks (`POST /pay`, `GET /verify`,
`POST /webhooks/:provider`) end to end. Found two distinct kinds of
error messages currently reaching the client, previously handled
identically:
1. **Provider-authored, user-facing messages** — e.g. Paystack/Korapay/
   Juicyway's `responseData.message`, Payscribe's `responseData.description`
   (a "insufficient funds"/"invalid account" style string the provider
   itself designed to be shown to an end user). Safe to pass through,
   and the whole point of surfacing them.
2. **Internal/operational messages** — network failures inside
   `fetch()` (DNS errors, connection resets), JSON-parse failures on a
   non-JSON response, and — the one worth calling out — `getProviderKey()`/
   `getProviderBaseUrl()` in `utils/helpers.js` throwing "API key not
   found for X" / "No base URL configured for X" when a provider isn't
   configured on this deployment. That second one is a real, if minor,
   information-disclosure gap: it was reaching the client verbatim,
   telling any caller exactly which providers this server does or
   doesn't have live credentials for — deployment/readiness state that
   has no reason to be public. (Deliberately did NOT flag "Provider 'x'
   not supported" / "Unsupported provider" messages the same way —
   those just restate which provider names are valid, no more sensitive
   than the API's own documented provider list.)
Fixed by adding `providerError()` in `utils/helpers.js` (wraps a
message and tags it `isProviderMessage = true`), used at all 7
provider-response-failure throw sites across the four provider files
in place of a bare `new Error(...)`. `handleApiCall()` (also in
`utils/helpers.js`) now only passes a caught error's message through to
the client verbatim when it carries that flag — anything else becomes
a generic `Unable to complete request with <provider> right now...`,
while the real message still goes to the server log line immediately
above (unchanged). Separately, `getProviderKey()`/`getProviderBaseUrl()`
now tag their throws `isConfigError = true`; added a shared
`clientSafeMessage(error, fallback)` helper in `routes.js`, used by all
three catch blocks, which swaps in a generic "Payment service is
temporarily unavailable for this provider" message whenever that flag
is present. Full detail is unaffected in every case — only the
*client-facing* `message` field changes; server-side `log(...)` calls
still get the real error text everywhere.
**Incidental fix found while reviewing, included in the same commit:**
`GET /verify`'s catch block always answered `500` regardless of
`error.statusCode` — the same pre-existing bug pattern Task 10 already
fixed for `POST /pay` (and `POST /webhooks/:provider` has respected it
since Task 3), just never applied here. Now consistent across all
three routes.
Verified: `node --check` on all six touched files (`routes.js`,
`utils/helpers.js`, all four provider files) — all pass. A throwaway
`node -e`-style script (deleted after use) exercised `handleApiCall`
with a `providerError()`-flagged throw (message passed through
verbatim) and an unflagged `TypeError` (message replaced with the
generic one), plus `clientSafeMessage()` against a tagged config error
(sanitized) and an untagged validation error (passed through) — all
four matched expectation.
**Why the box stays unchecked:** rate limiting was explicitly descoped
for this session per direct project owner instruction ("no need for
rate limiting"), not skipped for a code reason — it's still real,
unaddressed scope from this task's original description (no rate
limiting exists anywhere in this repo). A future session should pick
up just that half; the error-handling-review half above doesn't need
to be redone.

### Task 14 — End-to-end manual test pass [ ]
Using each provider's sandbox/test keys, exercise `/api/pay` and
`/api/verify` (and by this point, the webhook handlers) for all four
providers. Write down what you tested and the result as a short
`TESTING.md` (or append to this file) — this is a manual pass, not an
automated test suite (no test framework is set up in this repo yet;
adding one is out of scope unless a future task specifically calls
for it). Confirm `/health`'s provider-key check reflects reality.

### Task 15 — Final audit pass before handoff to Mavins-web [x]
Re-read all four provider files and `routes.js` end to end. Confirm
every `⚠️` / TODO-style comment from the original code has either been
resolved or turned into a tracked task above. Confirm the "Confirmed
research findings" section is fully up to date (no more "secondary
source, not yet confirmed" caveats left for anything that got used in
shipped code). This is the last B-PAY-backend-only task — Task 16
onward switches repos.

**What was found / what changed:** Grepped all four provider files,
`routes.js`, `utils/helpers.js`, and `index.js` for `⚠️`/TODO/FIXME/XXX
and for looser uncertainty language (confirm/verify/assume/guess/not
sure), then read every hit in context rather than trusting the grep
alone. Most hits were either legitimate runtime warning log lines (not
TODOs) or already-resolved decisions with their reasoning documented
inline (e.g. the Korapay-idempotent-reuse secondary-source correction
from Task 12, already recorded as settled). Two real findings:
1. **`routes.js`'s Payscribe `TODO (Task 6): find + verify Payscribe's
   signature scheme...`** — already correctly tracked (Task 6, on hold
   pending PENDING_DOCS). No action needed.
2. **`providers/juicyway.js`'s `⚠️ Verify exact endpoint path in
   Juicyway docs` comment** — genuinely unresolved AND untracked. It's
   mentioned in the "Confirmed research findings" section (added by
   Task 5, which was webhooks-only in scope) but no task in the queue
   ever picked it up, unlike the equivalent gap for Korapay (closed by
   Task 7) and Paystack (queued as Task 8). This is exactly the kind of
   gap this task exists to catch. **Added Task 8b** above (same shape
   as Task 7/8, marked on hold under "Current focus: Korapay only" for
   the same reason Task 8 is) to close it — the comment itself is left
   in place in the code as the pointer to that task, same as how
   Task 6's Payscribe TODO comment still sits in `routes.js`.
Also found the "Known issues" bullet about provider error messages
reaching the client verbatim was now stale — Task 13's error-handling
pass (this same session, immediately prior) had already addressed it.
Updated that bullet to reflect what Task 13 actually did, and split
"No rate limiting anywhere" out as its own still-open line (Task 13
deliberately did not touch rate limiting — see that task's note).
Confirmed the "Confirmed research findings" section itself has no
remaining "secondary source, not yet confirmed" language attached to
anything actually shipped in code — the only genuinely open item
findings-side is the JuicyWay endpoint path above, now tracked as
Task 8b.
**Box checked because this task's own bar is "resolved or tracked",
not "everything is finished":** the audit's job was to catch anything
left dangling and make sure it has a home in the queue, which is now
true for both TODO-style comments found. Task 8b itself remains open
(on hold, same as Task 8) — that's expected follow-up work, not a
reason to leave this audit task unchecked. A future session revisiting
this audit should start by confirming Task 8b's status before
re-scanning from scratch.

---

## Cross-repo continuation

**Important — all three repos in this project (B-Pay-backend,
Mavins-web, and Velune) each have their own `handover.md`.** See "This
is a 3-repo project" near the top of this file for the full mechanics
(which commands change, how the hand-off to the human differs per
repo, the "Sibling repos" list with each repo's URL and push
mechanics) — summary: when a task below says to clone a different
repo, that session's job is to: (a) do the specific fix described,
fully inside that other repo's own clone (own commits, own patches,
own `git am`/push form — not this repo's), AND (b) update *that other
repo's* `handover.md` with what was done and what's left — so the next
session picks up the thread there, in that repo, using that repo's own
patch numbering and its own hand-off instructions. Don't let context
about a still-open B-Pay-backend task get lost just because work moved
to another repo — leave a one-line pointer back here if a Mavins-web or
Velune task turns out to depend on something not yet finished in this
file.

### Task 16 — Clone Mavins-web, diagnose the Korapay amount bug [x]
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

**What was found / what changed:** Hypothesis confirmed, plus an
additional compounding bug the hypothesis didn't anticipate — full
detail lives in **Mavins-web's own `handover.md`, Task 26** (per this
file's own cross-repo continuation convention), not duplicated here.
Short version: `fund-wallet/page.tsx` did have the guessed 100x
unit-conversion bug, AND separately hardcoded `currency: 'NGN'` while
the amount itself was actually always USD — so it wasn't just scaled
wrong, it was tagged with the wrong currency too. Mid-session, the
project owner corrected the initial fix attempt (which had removed the
100x but kept NGN as the default): this app's real default/base
currency is USD, not NGN, and no client-side currency conversion
should happen at all — Korapay's own **Dynamic Currency Conversion
(DCC)** (confirmed against
developers.korapay.com/docs/dynamic-currency-conversion) is meant to
handle showing a non-US payer their own local currency at checkout,
driven by `payment_currency`/`settlement_currency` fields on the
charge request, converted at Korapay's live rate on Korapay's side.
**This repo's own code needed a companion change** to make that
possible: `routes.js`'s `POST /pay` previously destructured a fixed
field whitelist from `req.body` that silently dropped `payment_currency`/
`settlement_currency` even if a caller sent them — added both to the
destructure and to `paymentData`, and `providers/korapay.js` now
attaches them to the Korapay API payload when both are present.
Real, code-unverifiable prerequisite (documented in Mavins-web's Task
26, repeated here since it affects this repo's own Korapay integration
too): DCC requires the merchant's Korapay account to have Currency
Conversion product access (Kora-granted) and a per-currency dashboard
toggle enabled — neither can be confirmed or set from either repo's
code, and DCC requests will fail on Korapay's side until both are done
regardless of how correct this code is. Ties into this repo's own
Task 14 (blocked on real sandbox keys) for actually exercising this
end-to-end. Verified: `node --check routes.js` and `node --check
providers/korapay.js` both pass.

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

**Status check this session (from B-Pay-backend, while starting Task
9b below) — this task has NOT been done, and this file's own note
about it was stale/misleading:** cloned Mavins-web fresh and confirmed
directly (not from memory) that `TARGET_COUNTRIES` grew from 14 to 25
entries via *Mavins-web's own* Task 23 ("shuffle 8-of-25 countries by
genre"), but that was a country-*targeting-pool* task, not a currency
reconciliation task — it never touched `COUNTRY_CURRENCY`, which is
still the original 20-entry list. Comparing the two lists directly as
they stand now: only 12 country codes appear in both (NG, US, GB, GH,
KE, ZA, CA, AU, IN, AE, BR, MX). `TARGET_COUNTRIES` has 13 codes
`COUNTRY_CURRENCY` doesn't (FR, DE, JM, NL, CI, SN, TZ, UG, EG, ES, IT,
SE, KR), and `COUNTRY_CURRENCY` has 9 codes not in `TARGET_COUNTRIES`
at all (EU, PK, BD, ID, PH, MY, SG, SA, TR — these look like a leftover
generic currency-conversion list, unrelated to campaign targeting). The
two lists are further apart in absolute terms than when this task was
first written (14-vs-20 has become 25-vs-20, with less overlap
proportionally). **Also: this task, as written here in B-Pay-backend's
`handover.md`, was never actually copied into Mavins-web's own
`handover.md` as a task in that file's queue** — confirmed by grepping
Mavins-web's `handover.md` for "TARGET_COUNTRIES"/"COUNTRY_CURRENCY"/
"reconcile"; the only hits are Task 23 (unrelated scope, above) and
nothing else. So there is currently no queued task anywhere that will
pick this up. **Whoever next works Mavins-web should add this as a real
task in that repo's own `handover.md`** (not just leave it living only
here) before attempting it, per this whole project's cross-repo
continuation pattern.

### Task 19 — Mavins-web: route currency + payment method by geo [ ]
Use the existing `detectUserGeo` service (via ipapi.co, already present
in this codebase per an earlier session) to determine the user's
country, then: for African countries where Korapay supports
mobile-money/bank-transfer (per B-Pay-backend's confirmed findings —
check that file's current state, it may have grown since this note was
written), route the checkout amount + currency + preferred method
accordingly; for countries where none of the backend's providers has
local rails, fall back to USD via whichever provider/channel supports
USD. This depends on Task 18's reconciled currency list (still not
done as of this file's latest check — see that entry) and on
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

### Task 23 — Confirm this backend no longer needs to be the reference source, and that its real caller is the edge function [ ]
Per "Project owner decisions" → Decision 1 (as corrected): the app
generates and owns the payment `reference` client-side and writes it to
Supabase, but this backend's actual caller is the **Supabase Edge
Function**, not the app directly — the edge function calls `POST /pay`
with that reference, and also owns webhook reconciliation. Audit
`POST /pay` in `routes.js` and confirm that path: (a) still works
correctly when the caller (the edge function) always supplies its own
`reference` (the common case going forward), and (b) decide whether
`generateReference()`'s own-reference fallback should stay as a defensive
default for malformed/legacy callers or be treated as a bug signal (log a
warning) now that it's not supposed to be relied on. Also worth checking
as part of this audit: whether `POST /pay` needs any caller-identity/auth
check now that its intended caller is a trusted Supabase Edge Function
rather than an untrusted client directly (this backend currently has no
such check — flag it as a new "Known issues" bullet if it's genuinely
missing, don't fix it in this same task unless it's trivial). Don't
remove the reference fallback outright without checking whether any
current caller still depends on it — this is an audit-and-decide task,
not an automatic deletion.

### Task 24 — Mavins-web: implement wallet-crediting + first-time-vs-returning-user logic [ ]
Per "Project owner decisions" → Decisions 2 and 3 above (owner-provided,
recorded in this file for continuity — implementation belongs in
Mavins-web, not here). Copy Decisions 1 (as corrected), 2, and 3 into
Mavins-web's own `handover.md` as their own task(s) before starting: (1)
client-side reference generation + Supabase write, **and** the Supabase
Edge Function that calls this backend's `POST /pay` with that reference
(the app itself should stop calling this backend directly, if it
currently does) — this unblocks this repo's Task 23; (2) wallet-balance
computation on confirmed webhook
(full amount minus platform fee, credited only for returning users doing
a top-up — first-time users who pay directly for a campaign see no
wallet balance change, ever); (3) the shared user/admin success screen
with the animated country-interconnection pipeline visualization
(central hub node, animated links out to each selected country) shown on
confirmed payment. Split further once in Mavins-web's own file if any of
(1)/(2)/(3) turns out to be bigger than one session — same one-task-per-
session rule as this file.

---

## Patches issued so far (keep this updated so numbering doesn't collide)

- `0001-webhook-route-skeleton.patch` — Task 2 (webhook routing
  skeleton, `routes.js`). Verified to apply cleanly with `git am`
  against `3811f7f` (Task 1's commit) and pass `node --check` on both
  touched/importing files, in a fresh `/tmp` clone, before handing
  off.
- `0002-paystack-webhook-signature.patch` — Task 3 (Paystack webhook
  signature verification + `charge.success` handling,
  `providers/paystack.js` + `routes.js`). Verified to apply cleanly
  with `git am` against `9fc20f7` (the pushed, real hash of Task 2's
  commit on `origin/main` — not the local `567d518` it had before the
  human pushed it) and pass `node --check` on both touched files, in a
  fresh `/tmp` clone, before handing off.
- `0003-korapay-webhook-signature.patch` — Task 4 (Korapay webhook
  signature verification + 6-event handling,
  `providers/korapay.js` + `routes.js`). Verified to apply cleanly
  with `git am` against `1d7fbd3` (the pushed hash of Task 3's commit
  on `origin/main`) and pass `node --check` on both touched files, in
  a fresh `/tmp` clone, before handing off.
- `0004-korapay-paystack-currency-routing-validation.patch` — Task 10
  (partial, Korapay-focus session; currency-aware validation for
  Paystack/Korapay in `POST /pay`, `utils/helpers.js` +
  `routes.js`). Verified to apply cleanly with `git am` against
  `1fe8a34` (Task 9's commit, the local HEAD this session started
  from — this session did not yet know that commit's real pushed hash
  on `origin/main`, since it hadn't been pushed yet when this session
  ran; whoever runs `git am` for this patch should confirm
  `git log -1` shows `1fe8a34` as the current HEAD before applying,
  and if not, note the actual hash here) and pass `node --check` on
  both touched files, in a fresh `/tmp` clone, before handing off.
- `0005-post-pay-request-validation.patch` — Task 11 (request-shape
  validation on `POST /pay`: `utils/helpers.js` + `routes.js`). Same
  caveat as `0004` above: verified with `git am` against `192fe24`
  (this session's own prior Task 10 commit, not yet known to be pushed
  to `origin/main` at the time this patch was generated) in a fresh
  `/tmp` clone, `node --check` passing on both touched files. If
  `0004` has already been applied and pushed by the time this patch is
  applied, `192fe24` should already be the current `origin/main` HEAD
  and this should apply with no extra steps; if not, apply `0004`
  first.
- `0006-reference-format-validation.patch` — Task 12 (in-scope half:
  client-supplied `reference` format validation, `routes.js` only).
  Same caveat as `0004`/`0005`: verified with `git am` against `0fd6260`
  (this session's own prior Task 11 commit) in a fresh `/tmp` clone,
  `node --check` passing. Apply `0004` and `0005` first if they
  haven't been pushed yet.
- `0007-handover-owner-decisions-wallet-reference.patch` — docs-only,
  not tied to a numbered task box: records the project owner's
  Decision 1/2/3 (reference storage, wallet crediting, success UI),
  adds Task 23/24. Verified with `git am` against `2423c7c` (Task 12's
  commit) in a fresh `/tmp` clone. **Superseded in part by `0008`
  below — apply both, in order, `0007` then `0008`.**
- `0008-handover-decision1-correction-edge-function.patch` — docs-only
  correction to `0007`: Decision 1 originally said the app calls this
  backend directly; the project owner corrected this — the app writes
  the reference to Supabase, but the **Supabase Edge Function** is
  this backend's actual caller, not the app. Updated Decision 1, the
  matching "Known issues" bullet, and Tasks 23/24 accordingly. Verified
  with `git am` against `5582fdf` (this session's own prior commit,
  i.e. `0007` applied) in a fresh `/tmp` clone. Requires `0007` applied
  first — will not apply standalone against `2423c7c`.
- `0009-task9b-dependency-check-mavins-web-task18-fix.patch` —
  docs-only, not tied to a numbered code task: attempted Task 9b (next
  unchecked task in queue order), found it's still blocked on
  Mavins-web's currency-list reconciliation, and found this file's own
  reference to that dependency ("Mavins-web's Task 18") was stale/
  misleading — Mavins-web's *own* Task 18 is an unrelated task, and the
  reconciliation was never actually added to that repo's own queue.
  Corrected Task 9b, Task 18, and Task 19's cross-references
  accordingly. Verified with `git am` against `bfb4905` (this session's
  own prior commit, i.e. `0007`+`0008` applied) in a fresh `/tmp` clone.
  Requires `0007` and `0008` applied first.
- `0010-three-repo-navigation-sibling-repos.patch` — docs-only, not
  tied to a numbered code task: added the "This is a 3-repo project"
  section near the top of this file plus a "Sibling repos" block,
  documenting the exact command/hand-off changes needed when a task's
  real subject is Mavins-web or Velune rather than this repo. Confirmed
  via GitHub API that Mavins-web is not a fork (unlike this repo), so
  it doesn't share this repo's fork→PR mechanics. Cross-linked from
  step 10 and from "Cross-repo continuation". Verified with `git am`
  against `a08fe58` (this session's own prior commit, i.e.
  `0007`+`0008`+`0009` applied) in a fresh `/tmp` clone. Requires
  `0007`, `0008`, and `0009` applied first.
- `0011-mavins-web-push-step-and-folder-casing-fix.patch` — docs-only
  correction to `0010`: Mavins-web's push step was missing from the
  "Sibling repos" note (it does push directly to `main`, no PR, since
  it isn't a fork), and the local clone folder is `mavins-web`
  (lowercase), not the GitHub repo's own `Mavins-web` casing. A
  matching correction was made in Mavins-web's own `handover.md`
  (separate patch, that repo — see its own patch log). Verified with
  `git am` against `41a8b4c` (this session's own prior commit, i.e.
  `0007`–`0010` applied) in a fresh `/tmp` clone. Requires `0007`
  through `0010` applied first.
- `0012-task12-checkbox-reconciliation.patch` — docs-only, closes out
  Task 12: no source file needed changing — `routes.js` already had
  `assertValidReferenceFormat` wired into `POST /pay` exactly as
  Task 12's own note described, and the storage/architecture decision
  it was waiting on had already arrived (Decision 1). The task's own
  "why box stays unchecked" paragraph had gone stale once the very next
  paragraph recorded that decision, leaving two contradictory notes
  back to back. Checked Task 12's box and replaced the stale paragraph
  with a session note explaining the reconciliation. Verified with
  `git am` against `71a9a3b` (this session's own prior HEAD, i.e.
  `0007`–`0011` applied) in a fresh `/tmp` clone. Requires `0007`
  through `0011` applied first.
- `0013-error-message-sanitization.patch` — Task 13 (error-handling-
  review half only; rate limiting explicitly descoped this session per
  project owner instruction — see the task's own note). Added
  `providerError()` + the `isProviderMessage` flag and `isConfigError`
  tagging in `utils/helpers.js`; used `providerError()` at all 7
  provider-response-failure throw sites across `providers/paystack.js`,
  `providers/korapay.js`, `providers/juicyway.js`, and
  `providers/payscribe.js`; added `clientSafeMessage()` in `routes.js`,
  used by all three catch blocks (`POST /pay`, `GET /verify`,
  `POST /webhooks/:provider`) — the last of which also picked up an
  incidental fix (now respects `error.statusCode` instead of always
  answering 500, matching `POST /pay`/`POST /webhooks/:provider`).
  Verified with `git am` against `de007f9` (this session's own prior
  commit, i.e. `0012` applied) in a fresh `/tmp` clone, `node --check`
  passing on all six touched files. Requires `0007` through `0012`
  applied first.
- `0014-task15-audit-pass.patch` — docs-only, Task 15 (final audit
  pass). Found `providers/juicyway.js`'s endpoint-path `⚠️` comment was
  genuinely unresolved and had never been turned into a queued task
  (unlike the equivalent Korapay/Paystack gaps, closed by Task 7 /
  tracked as Task 8) — added Task 8b to close that gap, on hold under
  "Current focus: Korapay only" same as Task 8. Also refreshed the
  "Known issues" bullet about provider error messages, which had gone
  stale now that Task 13 (this same session, immediately prior)
  addressed it. Checked Task 15's own box — its bar is "resolved or
  tracked," which is now true for both TODO-style comments found; the
  new Task 8b remains separately open. Verified with `git am` against
  `2eeb4e3` (this session's own prior commit, i.e. `0013` applied) in a
  fresh `/tmp` clone. Requires `0007` through `0013` applied first.
