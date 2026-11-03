# Mail canary

A nightly end-to-end check of Gmail sync on **preview** EDGE. It uses a real account
(`test@braneframe.com`), the real OAuth path (the token stays in kms-service) and the product's own
`*/10` sync trigger, so it fails where users' sync fails. Design: the
[Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani).

## How it works

- **Pool.** 10,000 Enron messages in the private agents fixture `enron-pool` (an mbox; see the
  `private-fixtures` skill). The pool stays out of Gmail: the sync takes every message added to the
  account, whatever its label, so mail parked there would sync on arrival rather than on its night.
- **Space.** A preview identity owns a space bound to the account with the defaults users get.
- **Nightly** (`.github/workflows/mail-canary-nightly.yml`, `moon run plugin-google:mail-canary`) runs
  three stages and writes `report.json`, `summary.json` and `summary.md`. It posts one `ci.mail-canary`
  PostHog event: alert on `ok = false` and on no event for 26 hours.
  1. **Seed.** Pulls the pool and inserts the next 100 messages into the inbox as mail received now
     (label `enron-seed`).
  2. **Monitor.** Waits up to 30 minutes for the canary space's own sync to pick the copies up, then checks
     them and every sync run of the past 24 hours.
  3. **Full sync.** Creates a fresh space, binds it to the account with a 730-day sync horizon and the
     connector's remote sync routine, waits up to 60 minutes for EDGE to sync it from scratch, checks it
     against Gmail, then deletes it.
- **Cursor.** Each copy carries `X-Dx-Seed` (its pool index) and `X-Dx-Seed-Next` (where the next run
  starts). A run reads the cursor off the newest `enron-seed` copy, so a failed or skipped night costs
  nothing, and the pool wraps after 100 nights.
- **Fresh space token.** kms-service registers a Google refresh token only from an OAuth consent in a
  browser, so the fresh space gets a plain access token minted from the canary's own grant, replaced every
  30 minutes while the stage waits. The canary space keeps the kms-held token, so stage 2 still covers that
  path. Before deleting the space, the stage disables its trigger and blanks the token, so EDGE stops
  syncing it even if the deletion never reaches EDGE; a run also deletes any fresh space a killed run left.

| Check | Stage | Fails when                                                                                                | Classes              |
| ----- | ----- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| S1    | 2     | a seeded copy is not in the mailbox feed when the wait ends, is there twice, or differs from Gmail's subject or sender | OFF, STALL, DATA     |
| S2    | 2     | a sync invocation in the past 24 hours failed (a `runAgain` yield is not a failure) or has no end after 10 minutes     | from the error, KILL |
| F1    | 3     | a Gmail message of the window (as the sync scopes it) is not in the fresh mailbox feed, is there twice, or a sampled one differs | OFF, STALL, DATA, SETUP |
| F2    | 3     | a sync invocation in the fresh space failed or hung                                                       | from the error, KILL |
| F3    | 3     | the binding's backfill never reached its horizon                                                          | OFF, STALL, DATA     |
| F4    | 3     | the fresh space could not be deleted                                                                      | SETUP                |

A missing message is `OFF` when the space has no enabled sync trigger, `STALL` when sync runs failed, and
`DATA` when they all succeeded. `DX_CANARY_STAGES` (workflow input `stages`) picks stages 1 and 3
(`seed,full` by default); stage 2 always runs.

The nightly reads the space through an in-process `@dxos/client` that recovers the identity from its
phrase, so each run adds one device to the identity; no device key is kept between runs.

## Setup (once)

Run from `packages/plugins/plugin-google`. The grant (`gmail.modify`, minted with the EDGE dev OAuth client
in 1Password `eng-dev/com.google`, section `dev`) is in `eng-dev/network.dxos.mail-canary`.

1. **Space.** With the `dx` CLI on a `preview` profile: `dx account signup --method email <code>
   test@braneframe.com`, `dx space create --name "Mail canary"`, then `dx halo seed` for the recovery
   phrase. In Composer, sign in as the test account and add a Gmail connection with the defaults.
2. **Verify.** `MAIL_CANARY_RECOVERY_PHRASE=... vite-node canary/setup.ts verify <space id>`.
3. **CI.** Secrets `MAIL_CANARY_RECOVERY_PHRASE` and `MAIL_CANARY_GMAIL_{CLIENT_ID,CLIENT_SECRET,REFRESH_TOKEN}`,
   variable `MAIL_CANARY_SPACE_ID`. To pull the pool: `MAIL_CANARY_FIXTURES_AGE_KEY` (the agents key,
   1Password `eng-dev/network.dxos.fixtures`), `MAIL_CANARY_R2_TOKEN` (a Cloudflare API token with R2
   read on `test-fixtures` only) and `CLOUDFLARE_ACCOUNT_ID`.

A grant that stops working (revoked, password changed, unused for six months) shows as class `AUTH`; mint
a new refresh token with the same client and scope and update the secrets.
