# Mail canary

An end-to-end canary for Gmail sync on the deployed **preview** EDGE. It runs against a real Gmail
account (`test@braneframe.com`), the real OAuth path (the token stays in kms-service), and the
product's own sync trigger, so it fails where users' mail sync fails.

Design: the [Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani). Background:
[dxos/dxos#12719](https://github.com/dxos/dxos/issues/12719) (memory kills) and
[dxos/dxos#14173](https://github.com/dxos/dxos/pull/14173) (flush hang until the 60 s deadline).

## How it works

- **Pool (once).** 10,000 Enron messages sit in Gmail under the archived label `enron-pool`, all older
  than the sync's 30-day window. Their age, not a filter, keeps them out of the canary space.
- **Canary space (once).** A preview identity owns a space bound to the test account with no filter,
  the default sync-back and the product's `*/10` remote sync trigger: the users' code path.
- **Nightly.** CI copies 100 pool messages into the inbox as fresh mail (label `dx-seed`), waits for
  the space's own sync to pick them up, and checks the last 25 hours of the Execution Trace feed, so a
  failure between two nights is seen even if later runs succeeded.

## Steps

| Step | Command                                         | Runs                 | Needs                       |
| ---- | ----------------------------------------------- | -------------------- | --------------------------- |
| 01   | `node scripts/01-build-pool.mjs`                | once                 | the CMU Enron maildir       |
| 02   | `node scripts/02-import-pool.mjs`               | once, before step 03 | the canary's Gmail grant    |
| 03   | `node scripts/03-setup-space.mjs`               | once                 | `dx` (bun), Composer        |
| 04   | `moon run mail-canary:nightly`                  | nightly in CI        | the variables below         |

### 01 Build the pool

```bash
# CMU Enron corpus, https://www.cs.cmu.edu/~enron/ (443 MB); only these custodians are needed.
tar -xzf enron_mail_20150507.tar.gz -C ~/enron maildir/kean-s maildir/dasovich-j maildir/kaminski-v
node scripts/01-build-pool.mjs --maildir ~/enron/maildir --out ~/enron/enron-pool.mbox
node scripts/01-build-pool.mjs --maildir ~/enron/maildir --out ~/enron/trial.mbox --limit 10
```

It drops duplicates by content (one custodian files the same mail in several folders, hence three
custodians) and messages with no body, samples `--limit` (10,000) evenly over time, moves the dates
into the year ending 31 days ago, drops `Bcc`, and records every folder a message was filed in as
`X-Gmail-Labels: Enron/<custodian>/<folder>,...`. The corpus is real people's mail: keep it out of git.

### 02 Import the pool

```bash
GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/02-import-pool.mjs auth   # values: eng-dev/com.google, section dev
node scripts/02-import-pool.mjs ~/enron/trial.mbox      # then check label:enron-pool in Gmail
node scripts/02-import-pool.mjs purge
node scripts/02-import-pool.mjs ~/enron/enron-pool.mbox # about 20 minutes, resumable
```

- `auth` mints the canary's own grant (`gmail.modify`) with a browser consent as the test account and
  writes it to `.secrets/mail-canary-gmail.env`. It uses EDGE dev's Google OAuth client (1Password
  `eng-dev/com.google`, section `dev`), which lists `http://127.0.0.1:53682/` as an authorized
  redirect; run it on a machine with a browser. If that client's consent screen is External and in
  testing mode, the refresh token expires after 7 days. Store the refresh token in section
  `mail-canary` (`GMAIL_REFRESH_TOKEN`), where a cloud session reads it through `gmail.env.tpl`, and
  all three values in the CI secrets.
- An import puts each message in the mailbox without sending it: archived, never spam, labelled
  `enron-pool` and with its folders, dated by its `Date` header. In the trial, check the dates are the
  shifted ones (not 2001, not today) and the `Enron/...` labels are there; `purge` then trashes it.
- After the import, the script fails unless the pool holds exactly the mbox, nothing is in the inbox
  and nothing is newer than 31 days. Every command refuses a grant for any account but
  `GMAIL_ACCOUNT` (default `test@braneframe.com`).

**Import before step 03, never while the canary space exists:** the sync fetches new mail by id with
no date check, so it would pull the whole pool in.

### 03 Create the canary identity and space

```bash
node scripts/03-setup-space.mjs create <hub access code>   # follow the link the hub emails
node scripts/03-setup-space.mjs verify <space id>          # after binding Gmail
```

`create` makes a `mail-canary` dx profile on preview, signs up the test address, creates the space and
prints its id (variable `MAIL_CANARY_SPACE_ID`) and the recovery phrase (secret
`MAIL_CANARY_RECOVERY_PHRASE`) once. Then, in Composer on preview, sign in as the test account, open
"Mail canary" and add a Gmail connection with the defaults; the CLI cannot bind a mailbox yet.
`verify` checks the space has a mailbox, a trace feed and one enabled remote sync trigger.

### 04 Nightly check

`.github/workflows/mail-canary-nightly.yml` runs `moon run mail-canary:nightly` at 03:17 UTC. Each run
trashes copies older than 2 days, seeds a new slice of the pool, signs in with the recovery phrase in
a throwaway `HOME`, polls the space through `dx eval` until every copy is synced (up to 45 minutes),
runs the checks, and writes `report.json`, `summary.json` and `summary.md`.

| Check | Fails when                                                        | Classes        |
| ----- | ----------------------------------------------------------------- | -------------- |
| C1    | a sync run started and has no end after 10 minutes                | KILL           |
| C2    | a sync run ended in failure (a `runAgain` yield is not a failure) | from the error |
| C3    | no sync run started for more than 12 minutes                      | IDLE           |
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
scripts/               steps 01–03
src/gmail/             GmailClient (test account only), the grant and consent, header helpers
src/pool/              Pool: import the mbox, check it is exact, purge a trial
src/seed/              Seeder: copy pool mail into the inbox, trash and list old copies
src/space/             SpaceReader: sign in with dx and snapshot the space through `dx eval`
src/checks/            checks C1–C7 over one snapshot
src/nightly/           Nightly: trash, seed, wait, check; the report and the live test
```

`moon run mail-canary:test` runs the unit tests (part of Check).
