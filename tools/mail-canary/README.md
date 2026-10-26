# Mail canary

An end-to-end canary for Gmail sync on the deployed **preview** EDGE. It runs against a real Gmail
account (`test@braneframe.com`), the real OAuth path (the token stays in kms-service), and the
product's own sync trigger, so it fails where users' mail sync fails.

Design and reasoning: the [Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani).
Background: [dxos/dxos#12719](https://github.com/dxos/dxos/issues/12719) (memory kills) and
[dxos/dxos#14173](https://github.com/dxos/dxos/pull/14173) (flush hang until the 60 s deadline).

## How it works

- **Pool (once).** About 25,000 Enron messages are imported into Gmail under the archived label
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
| 02   | `scripts/02-import-pool.sh`              | once, before step 03      | GYB, Gmail credentials                  |
| 03   | `scripts/03-setup-space.sh`              | once                      | `dx` CLI, a browser for the Gmail OAuth |
| 04   | `moon run mail-canary:nightly`           | nightly in CI, or by hand | all secrets below                       |

### 01 Build the pool

Download and extract the [CMU Enron corpus](https://www.cs.cmu.edu/~enron/) (`enron_mail_20150507.tar.gz`,
about 1.7 GB extracted), then pick one large custodian:

```bash
python3 scripts/01-build-pool.py --maildir ~/enron/maildir --custodian kean-s --out ~/enron/pool/enron-pool.mbox
python3 scripts/01-build-pool.py --maildir ~/enron/maildir --custodian kean-s --out ~/enron/trial/trial.mbox --limit 10
```

- Dates are spread over `--span-days` (default 365) ending `--end-days-ago` (default 31) days before
  today. Keep the end at least 31 days back: that is what keeps the pool out of the canary's sync.
- Corrupt Enron dates are clamped into 1998–2002, `Bcc` is dropped, and a missing `Message-ID` is
  generated.
- The corpus is real people's mail. Keep the mbox out of git; store it with the `private-fixtures`
  skill if it has to be shared.

### 02 Import the pool

Install [GYB](https://github.com/GAM-team/got-your-back) and authorize it as the test account (it
opens a browser once). Import the 10-message trial first and look at it in Gmail, then the full pool:

```bash
scripts/02-import-pool.sh ~/enron/trial
scripts/02-import-pool.sh ~/enron/pool
```

The script ends with `node src/main.ts pool-status`, which fails unless the pool is non-empty, has
nothing in the inbox, and has nothing newer than 31 days.

**Import before step 03, and never again while the canary space exists.** The sync fetches the
history delta's new mail by id with no date check, so an import into a space that already syncs
would pull the whole pool in. To rebuild the pool, delete the canary space first and repeat step 03.

### 03 Create the canary identity and space

See the comments in `scripts/03-setup-space.sh`.

### 04 Nightly check

`.github/workflows/mail-canary-nightly.yml` runs `moon run mail-canary:nightly` daily at 03:17 UTC
and on demand. To run it by hand, export the variables below and run the same command.

Each run:

1. trashes `dx-seed` copies older than 2 days (keeps the inbox small and exercises deletes);
2. copies `DX_CANARY_SEED_COUNT` pool messages (default 100) into the inbox, a different slice each
   day, so no cursor has to be stored;
3. signs in to the canary identity with the recovery phrase and polls the space until every copy is
   in the mailbox feed, for up to 45 minutes;
4. runs the checks below and writes `report.json` and `summary.json` to `dirname($DX_CANARY_REPORT)`.

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
| `GMAIL_CLIENT_ID`            | 02, 04    | Desktop OAuth client of the test account's Google Cloud project         |
| `GMAIL_CLIENT_SECRET`        | 02, 04    | its secret                                                              |
| `GMAIL_REFRESH_TOKEN`        | 02, 04    | refresh token for `test@braneframe.com` with scope `gmail.modify`       |
| `DX_CANARY_RECOVERY_PHRASE`  | 04        | recovery phrase of the canary identity (printed by step 03)             |
| `DX_CANARY_SPACE_ID`         | 04        | the canary space (printed by step 03)                                   |
| `DX_CANARY_SEED_COUNT`       | 04        | copies per night, default 100                                           |
| `DX_CANARY_REPORT`           | 04        | where to write `report.json`; `summary.json` goes beside it             |

In CI the first three are the secrets `MAIL_CANARY_GMAIL_*`, the recovery phrase is the secret
`MAIL_CANARY_RECOVERY_PHRASE`, and the space id is the repository variable `MAIL_CANARY_SPACE_ID`.

The Gmail grant is the test account's own, separate from the kms-managed token the sync uses, so a
failing sync token cannot also blind the canary. Mint it as plugin-google
`src/operations/mail/sync/TESTING.md` describes, with the `gmail.modify` scope.

## Alerts

Every run, pass or fail, posts one `ci.mail-canary` event to PostHog (`scripts/ci-event.mjs`), with
flat properties: `ciOk`, `ciFailedChecks`, `ciFailureClasses`, `ciSyncMinutes`, run counts. Alert on
`ciOk = false`, and on no event for 26 hours, which catches a canary that stopped running.

## Development

```bash
moon run mail-canary:test      # unit tests of the seeding and the checks; part of Check
moon run mail-canary:nightly   # the live run; needs the variables above
node src/main.ts seed --count 5
node src/main.ts trash --days 2
```
