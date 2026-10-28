# Mail canary

An end-to-end canary for Gmail sync on the deployed **preview** EDGE. It runs against a real Gmail
account (`test@braneframe.com`), the real OAuth path (the token stays in kms-service), and the
product's own sync trigger, so it fails where users' mail sync fails.

Design: the [Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani). Background:
[dxos/dxos#12719](https://github.com/dxos/dxos/issues/12719) (memory kills) and
[dxos/dxos#14173](https://github.com/dxos/dxos/pull/14173) (flush hang until the 60 s deadline).

## How it works

- **Pool (once).** 1,000 Enron messages sit in the Gmail inbox under `enron-pool`, the only label the
  canary uses, dated inside the sync's 30-day window so the canary space syncs all of them.
- **Canary space (once).** A preview identity owns a space bound to the test account with no filter,
  the default sync-back and the product's `*/10` remote sync trigger: the users' code path.
- **Nightly.** CI rotates the pool: it copies the 100 oldest pool messages into the inbox as new mail
  dated now (label `enron-pool` only) and trashes the originals, so the inbox stays at 1,000 and the
  sync sees both new mail and deletes. It waits for the space's own sync to pick the copies up, and
  checks the last 25 hours of the Execution Trace feed, so a failure between two nights is seen even
  if later runs succeeded.

## Steps

Run the commands from `packages/plugins/plugin-google`.

| Step | Command                                         | Runs                 | Needs                       |
| ---- | ----------------------------------------------- | -------------------- | --------------------------- |
| 01   | `node scripts/mail-canary/01-build-pool.mjs`    | once                 | the CMU Enron maildir       |
| 02   | `node scripts/mail-canary/02-import-pool.mjs`   | once, before step 03 | the canary's Gmail grant    |
| 03   | `node scripts/mail-canary/03-setup-space.mjs`   | once                 | `dx` (bun), Composer        |
| 04   | `moon run plugin-google:mail-canary`            | nightly in CI        | the variables below         |

### 01 Build the pool

```bash
# CMU Enron corpus, https://www.cs.cmu.edu/~enron/ (443 MB); only these custodians are needed.
tar -xzf enron_mail_20150507.tar.gz -C ~/enron maildir/kean-s maildir/dasovich-j maildir/kaminski-v
node scripts/mail-canary/01-build-pool.mjs --maildir ~/enron/maildir --out ~/enron/enron-pool.mbox
node scripts/mail-canary/01-build-pool.mjs --maildir ~/enron/maildir --out ~/enron/trial.mbox --limit 10
```

It drops duplicates by content (one custodian files the same mail in several folders, hence three
custodians) and messages with no body, samples `--limit` (1,000) evenly over time, moves the dates
into the 28 days ending yesterday (inside the 30-day sync window), and drops `Bcc`. The corpus is real
people's mail: keep it out of git.

### 02 Import the pool

```bash
GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/mail-canary/02-import-pool.mjs auth   # values: eng-dev/com.google, section dev
node scripts/mail-canary/02-import-pool.mjs ~/enron/trial.mbox      # then check label:enron-pool in Gmail
node scripts/mail-canary/02-import-pool.mjs purge
node scripts/mail-canary/02-import-pool.mjs ~/enron/enron-pool.mbox # about 20 minutes, resumable
```

- `auth` mints the canary's own grant (`gmail.modify`) with a browser consent as the test account and
  writes it to `.secrets/mail-canary-gmail.env`. It uses EDGE dev's Google OAuth client (1Password
  `eng-dev/com.google`, section `dev`), which lists `http://127.0.0.1:53682/` as an authorized
  redirect; run it on a machine with a browser. That client is External and In production, so the
  refresh token has no fixed expiry; Google flags a time-limited grant only with `refresh_token_expires_in`,
  which `auth` refuses. It still dies if revoked, unused for six months (the nightly uses it daily), or
  when the test account's password changes; the nightly then fails with class `AUTH`. Store the refresh token in 1Password
  `eng-dev/network.dxos.mail-canary` (`REFRESH_TOKEN`), where a cloud session reads it through
  `scripts/mail-canary/gmail.env.tpl`, and all three values in the CI secrets.
- An import puts each message in the mailbox without sending it: in the inbox, never spam, labelled
  `enron-pool` and nothing else, dated by its `Date` header. In the trial, check the dates are the
  shifted ones (not 2001, not today); `purge` then trashes it.
- After the import, the script fails unless the pool holds exactly the mbox, all of it in the inbox
  and inside the 30-day window. Every command refuses a grant for any account but
  `GMAIL_ACCOUNT` (default `test@braneframe.com`).

**Import before step 03, never while the canary space exists:** the sync takes mail imported into a
syncing space as new mail, by id and with no date check, so it would pull the whole pool in.

### 03 Create the canary identity and space

```bash
node scripts/mail-canary/03-setup-space.mjs create <hub access code>   # follow the link the hub emails
MAIL_CANARY_RECOVERY_PHRASE=$(op read op://eng-dev/network.dxos.mail-canary/RECOVERY_PHRASE) \
  node scripts/mail-canary/03-setup-space.mjs verify <space id>        # after binding Gmail
```

`create` makes a `mail-canary` dx profile on preview, signs up the test address, creates the space and
prints its id (variable `MAIL_CANARY_SPACE_ID`) and the recovery phrase (secret
`MAIL_CANARY_RECOVERY_PHRASE`) once; keep both in `eng-dev/network.dxos.mail-canary` (`SPACE_ID`,
`RECOVERY_PHRASE`). Then, in Composer on preview, sign in as the test account, open
"Mail canary" and add a Gmail connection with the defaults; the CLI cannot bind a mailbox yet.
`verify` reads the space as the nightly does (below) and checks it has a mailbox, a trace feed and one
enabled remote sync trigger.

### 04 Nightly check

`.github/workflows/mail-canary-nightly.yml` runs `moon run plugin-google:mail-canary` at 03:17 UTC. Each run
rotates the 100 oldest pool messages into fresh copies, and reads the space through an in-process
`@dxos/client`: it recovers the identity from the phrase into memory, waits for the space to match EDGE
(`syncToEdge`), pulls the mailbox and trace feeds (`db.syncFeed`) and queries them as typed objects
(`Mailbox`, `Message`, `Trace.Message`, `Trigger`). It re-reads until every copy is synced (up to 45
minutes), runs the checks, and writes `report.json`, `summary.json` and `summary.md`.

The checks count invocations of `GoogleMailSync`, paired by `pid`; an invocation that yields with
`Operation.runAgain()` is continued by one with the same `runId`, and the report counts both.

| Check | Fails when                                                        | Classes        |
| ----- | ----------------------------------------------------------------- | -------------- |
| C1    | an invocation started and has no end after 10 minutes             | KILL           |
| C2    | an invocation failed (a `runAgain` yield is not a failure)        | from the error |
| C3    | none started for the cron interval (`MAIL_SYNC_CRON`) plus 2 min  | IDLE           |
| C4    | the mail sync trigger is missing or disabled                      | OFF            |
| C5    | a copy older than 25 minutes is not in the mailbox feed           | DATA, STALL    |
| C6    | a Gmail message appears twice in the mailbox feed                 | DATA           |
| C7    | a synced copy's subject or sender differs from Gmail's            | DATA           |

C2 classes: `DEADLINE`, `REPO_CLOSED`, `KILL`, `AUTH`, `GONE`, `HANG`, `RATE`, else `UNKNOWN`.

| Variable                                                        | Used by | What                                                 |
| --------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | 02, 04  | the canary's grant (CI: `MAIL_CANARY_GMAIL_*`)       |
| `GMAIL_ACCOUNT`                                                 | 02, 04  | the only mailbox it writes to, `test@braneframe.com` |
| `DX_CANARY_RECOVERY_PHRASE`, `DX_CANARY_SPACE_ID`               | 04      | from step 03                                         |
| `DX_CANARY_SEED_COUNT`, `DX_CANARY_SYNC_TIMEOUT_MIN`            | 04      | copies per night (100), wait in minutes (45)         |
| `DX_CANARY_REPORT`                                              | 04      | where `report.json` goes; the summaries go beside it |

Every run posts one `ci.mail-canary` PostHog event (`ciOk`, `ciFailedChecks`, `ciFailureClasses`,
`ciSyncMinutes`, run counts). Alert on `ciOk = false` and on no event for 26 hours.

## Code

```text
scripts/mail-canary/   steps 01–03 and the 1Password template for the grant
src/canary/gmail/      GmailClient (test account only), the grant and consent, header helpers
src/canary/pool/       Pool: import the mbox, check it is exact, purge a trial
src/canary/seed/       Seeder: rotate the oldest pool mail into fresh copies and trash the originals
src/canary/space/      CanarySpace: recover the identity in-process and read a typed snapshot
src/canary/checks/     checks C1–C7 over one snapshot
src/canary/nightly/    Nightly: trash, seed, wait, check; the report and the live test
```

The unit tests run with the package's own `moon run plugin-google:test` (part of Check). Nothing in `src/canary/` is exported or bundled: it is test tooling that lives beside the sync it checks.
