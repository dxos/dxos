# Mail canary

An end-to-end canary for Gmail sync on the deployed **preview** EDGE. It runs against a real Gmail
account (`test@braneframe.com`), the real OAuth path (the token stays in kms-service), and the
product's own sync trigger, so it fails where users' mail sync fails.

Design and reasoning: the [Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani).
Background: [dxos/dxos#12719](https://github.com/dxos/dxos/issues/12719) (memory kills) and
[dxos/dxos#14173](https://github.com/dxos/dxos/pull/14173) (flush hang until the 60 s deadline).

## How it works

- **Pool (once).** 10,000 Enron messages are imported into Gmail under the archived label
  `enron-pool`. Every pool message is older than the sync's 30-day default window, so the canary
  space never syncs the pool. Its age, not a filter, keeps it out.
- **Canary space (once).** A preview identity owns a space with a Gmail connection to the test
  account. The binding has no filter and the default sync-back, and keeps the product's `*/10`
  remote sync trigger, so the canary runs the same code path as users.
- **Nightly.** A CI job copies 100 pool messages into the inbox as fresh mail (new `Date`, new
  `Message-ID`, label `dx-seed`), waits for the space's own sync to pick them up, and checks the
  space. It reads the Execution Trace feed for the last 25 hours, so a failure between two nights is
  still seen even if later runs succeeded.

## Steps

| Step | Script                                   | Runs                      | Needs                                   |
| ---- | ---------------------------------------- | ------------------------- | --------------------------------------- |
| 01   | `scripts/01-build-pool.py`               | once                      | the CMU Enron maildir                   |
| 02   | `scripts/02-import-pool.sh`              | once, before step 03      | the canary's Gmail grant                |
| 03   | `scripts/03-setup-space.sh`              | once                      | `dx` CLI, a browser for the Gmail OAuth |
| 04   | `moon run mail-canary:nightly`           | nightly in CI, or by hand | all secrets below                       |

### 01 Build the pool

Download and extract the [CMU Enron corpus](https://www.cs.cmu.edu/~enron/) (`enron_mail_20150507.tar.gz`,
443 MB). Only the custodians the pool uses need extracting:

```bash
tar -xzf enron_mail_20150507.tar.gz -C ~/enron maildir/kean-s maildir/dasovich-j maildir/kaminski-v
python3 scripts/01-build-pool.py --maildir ~/enron/maildir --out ~/enron/enron-pool.mbox
python3 scripts/01-build-pool.py --maildir ~/enron/maildir --out ~/enron/trial.mbox --limit 10
```

- `--limit` (default 10,000) messages are sampled evenly across the custodians' history, so the pool
  is not one folder or one month.
- Duplicates are dropped by content: the CMU release gives every file its own `Message-ID`, and one
  custodian files the same mail under several folders (kean-s has 25,351 files but 6,212 distinct
  messages), which is why the default takes three custodians. Messages with no text body are dropped
  too, because the Gmail mapper drops them and their copies would never sync.
- Dates are spread over `--span-days` (default 365) ending `--end-days-ago` (default 31) days before
  today. Keep the end at least 31 days back: that is what keeps the pool out of the canary's sync.
- Corrupt Enron dates are clamped into 1998–2002, `Bcc` is dropped, and a missing `Message-ID` is
  generated. The default build is about 38 MB.
- The corpus is real people's mail. Keep the mbox out of git.

### 02 Import the pool

The import uses the canary's own Gmail grant, the same one the nightly job uses. Mint it once with a
Desktop-app OAuth client of the test account's Google Cloud project (see plugin-google
`src/operations/mail/sync/TESTING.md` for creating one); it opens a browser for consent as
`test@braneframe.com` and writes `.secrets/mail-canary-gmail.env` at the repo root:

```bash
GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node src/main.ts auth
```

Then import the trial, look at it in Gmail, and import the pool:

```bash
scripts/02-import-pool.sh ~/enron/trial.mbox
scripts/02-import-pool.sh ~/enron/enron-pool.mbox
```

- Messages go in through `messages.import`: archived (no inbox), never spam, labelled `enron-pool`,
  with Gmail's internal date taken from the shifted `Date` header. 10,000 messages take about 20
  minutes at the per-user quota; 429 and 5xx answers are retried.
- The import is resumable: progress is kept in `<mbox>.imported`, so rerunning after an interruption
  continues where it stopped.
- Every command checks that the grant belongs to the test account (`GMAIL_ACCOUNT`, default
  `test@braneframe.com`) and fails otherwise.
- The script ends with `pool-status`, which fails unless the pool is non-empty, has nothing in the
  inbox, and has nothing newer than 31 days.

**Import before step 03, and never again while the canary space exists.** The sync fetches the
history delta's new mail by id with no date check, so an import into a space that already syncs
would pull the whole pool in. To rebuild the pool, delete the canary space first and repeat step 03.

### 03 Create the canary identity and space

```bash
scripts/03-setup-space.sh create <hub access code>   # dx profile, identity, space, recovery phrase
scripts/03-setup-space.sh verify <space id>          # after binding Gmail, below
```

`create` runs the monorepo's `dx` (`packages/devtools/cli/bin/dx`, needs bun) with a `mail-canary`
profile on preview:

1. `dx profile create --template preview`;
2. `dx account signup --method email <code> test@braneframe.com` — follow the emailed link;
3. `dx space create --name "Mail canary"`, then `dx space list` for its id;
4. `dx halo seed` for a recovery phrase.

It prints the space id (repository variable `MAIL_CANARY_SPACE_ID`) and the recovery phrase
(secret `MAIL_CANARY_RECOVERY_PHRASE`) once. Store both before closing the terminal.

**Bind Gmail in Composer, once.** The CLI cannot do this step yet: no command creates the mailbox
binding and its sync routine, and `dx connector add --preset google` stores the token under source
`google.com` where plugin-google expects `com.google`. In Composer on preview, sign in with
`test@braneframe.com`, open "Mail canary", add a Gmail connection for the test account, and accept
the defaults: no filter, default sync-back, the remote `*/10` sync routine enabled.

`verify` then reads the space through `dx eval` and should report one mailbox, one enabled remote
timer trigger and one Execution Trace feed.

### 04 Nightly check

`.github/workflows/mail-canary-nightly.yml` runs `moon run mail-canary:nightly` daily at 03:17 UTC
and on demand. To run it by hand, export the variables below and run the same command.

Each run:

1. trashes `dx-seed` copies older than 2 days (keeps the inbox small and exercises deletes);
2. copies `DX_CANARY_SEED_COUNT` pool messages (default 100) into the inbox, a different slice each
   day, so no cursor has to be stored;
3. signs in to the canary identity with the recovery phrase (`dx account login --method
   recovery-code` in a throwaway `HOME`, so every run admits one new device) and polls the space
   through `dx eval` until every copy is in the mailbox feed, for up to 45 minutes;
4. runs the checks below and writes `report.json` and `summary.json` to `dirname($DX_CANARY_REPORT)`.

The space reader (`src/read-space.ts`) pages both feeds newest first, 50 rows at a time, as sync's own
dedup seed does: a feed query has no filter pushdown yet, so filtering by Gmail id would decode the
whole feed, and EDGE fails a query response over 32 MiB.

| Check | Fails when                                                                    | Classes          |
| ----- | ----------------------------------------------------------------------------- | ---------------- |
| C1    | a sync run started and has no end after 10 minutes                            | KILL             |
| C2    | a sync run ended in failure (a `runAgain` yield is not a failure)             | from the error   |
| C3    | no sync run started for more than 12 minutes                                  | IDLE             |
| C4    | the mail sync trigger is missing or disabled                                  | OFF              |
| C5    | a copy older than 25 minutes is not in the mailbox feed                       | DATA, STALL      |
| C6    | a Gmail message appears twice in the mailbox feed                             | DATA             |
| C7    | a synced copy's subject or sender differs from Gmail's                        | DATA             |

C2 names the cause from the run's error: `DEADLINE` (`InvocationDeadlineError`), `REPO_CLOSED`,
`KILL` (memory or CPU limit), `AUTH` (managed token or Google grant), `GONE` (operation not found),
`HANG`, `RATE` (Gmail 429, 5xx or transport error), else `UNKNOWN`.

### Variables

| Variable                     | Used by   | What                                                                    |
| ---------------------------- | --------- | ----------------------------------------------------------------------- |
| `GMAIL_ACCOUNT`              | 02, 04    | the only mailbox the canary writes to, default `test@braneframe.com`    |
| `GMAIL_CLIENT_ID`            | 02, 04    | Desktop OAuth client of the test account's Google Cloud project         |
| `GMAIL_CLIENT_SECRET`        | 02, 04    | its secret                                                              |
| `GMAIL_REFRESH_TOKEN`        | 02, 04    | refresh token for `test@braneframe.com` with scope `gmail.modify`       |
| `DX_CANARY_RECOVERY_PHRASE`  | 04        | recovery phrase of the canary identity (printed by step 03)             |
| `DX_CANARY_SPACE_ID`         | 04        | the canary space (printed by step 03)                                   |
| `DX_CANARY_SEED_COUNT`       | 04        | copies per night, default 100                                           |
| `DX_CANARY_SYNC_TIMEOUT_MIN` | 04        | how long to wait for the copies, default 45                             |
| `DX_CANARY_REPORT`           | 04        | where to write `report.json`; `summary.json` goes beside it             |

In CI the first three are the secrets `MAIL_CANARY_GMAIL_*`, the recovery phrase is the secret
`MAIL_CANARY_RECOVERY_PHRASE`, and the space id is the repository variable `MAIL_CANARY_SPACE_ID`.

The Gmail grant is the test account's own, separate from the kms-managed token the sync uses, so a
failing sync token cannot also blind the canary. `node src/main.ts auth` mints it with the
`gmail.modify` scope (step 02).

## Alerts

Every run, pass or fail, posts one `ci.mail-canary` event to PostHog (`scripts/ci-event.mjs`), with
flat properties: `ciOk`, `ciFailedChecks`, `ciFailureClasses`, `ciSyncMinutes`, run counts. Alert on
`ciOk = false`, and on no event for 26 hours, which catches a canary that stopped running.

## Development

```bash
moon run mail-canary:test      # unit tests of the seeding and the checks; part of Check
moon run mail-canary:nightly   # the live run; needs the variables above
node --env-file-if-exists=../../.secrets/mail-canary-gmail.env src/main.ts seed --count 5
node --env-file-if-exists=../../.secrets/mail-canary-gmail.env src/main.ts trash --days 2
```
