# Mail canary

A nightly end-to-end check of Gmail sync on **preview** EDGE. It uses a real account (`test@braneframe.com`), the
product's own remote sync routine and an in-process `@dxos/client` that signs in as the canary identity, so it
fails where users' sync fails. Design: the [Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani).

## How it works

`.github/workflows/mail-canary-nightly.yml` pulls the pool and runs `moon run plugin-google:mail-canary`
(`test/canary.test.ts`). Every setting is in [`canary.yml`](./canary.yml); the workflow passes only credentials.

1. **Seed.** Inserts the next `seed.count` messages of the Enron pool into the inbox as mail received now (label
   `enron-seed`) and asks EDGE to run the canary space's sync trigger at once. Copies are never removed, so the mailbox,
   and the mail stage 3 syncs, grow by `seed.count` every night. The pool is the encrypted `enron-pool` agents fixture
   (10,000 messages), never Gmail: the sync takes every message added to the account. Each copy carries `X-Dx-Seed`
   (its pool index) and `X-Dx-Seed-Next` (where the next run starts), so a missed night costs nothing and the pool
   wraps after 10,000 / `seed.count` nights.
2. **Monitor.** Waits for the canary space to sync the copies, then checks them and every sync run of the window.
3. **Full sync.** Creates a fresh space, binds it to the account with a `fullSync.days` horizon and the connector's
   remote sync routine, starts it, and checks the result against Gmail. kms-service registers a refresh token only
   from a browser consent, so the fresh space gets a plain access token minted from the canary grant and replaced
   while it waits; stage 2 still covers the kms-held token. The space is then deleted on EDGE
   (`DELETE /data/space/:id`), which resets its documents, feeds, index, secrets and scheduler; the canary waits
   until EDGE answers 403 for the space, then tombstones it locally. A space left by a run that was killed is
   deleted at the start of the next run.

When stages 1 and 2 cannot run, S2 fails with the reason and stage 3 still runs; when stage 3 cannot, F1 does. Past
`runTimeoutMinutes` the run stops, deletes its fresh space and still writes its report. Every wait on EDGE is bounded
by `edge.*`, so a stuck step fails with a reason instead of hanging the run.

| Check | Fails when                                                                                       | Classes              |
| ----- | ------------------------------------------------------------------------------------------------ | -------------------- |
| S1    | a seeded copy is missing, synced twice, or differs from Gmail's subject or sender                | OFF, STALL, DATA     |
| S2    | a sync invocation in the window failed (a `runAgain` yield is not a failure) or hung             | from the error, KILL |
| F1    | a Gmail message of the fresh space's window is missing or synced twice                           | OFF, STALL, DATA     |
| F2    | a sync invocation in the fresh space failed or hung                                              | from the error, KILL |
| F3    | the fresh binding's backfill never reached its horizon                                           | OFF, STALL, DATA     |
| F4    | the fresh space, or one a killed run left behind, was not torn down on EDGE                      | SETUP                |

An invocation hangs when it stays open past `monitor.hungMinutes`. A check that cannot run at all fails as `SETUP`,
unless its error names a known cause such as `AUTH` or `RATE`.

A missing message is `OFF` with no enabled sync trigger, `STALL` when sync runs failed, `DATA` when they succeeded.
The run writes `out/summary.md`, `out/report.json` and `out/events.ndjson`; the workflow posts the events
(`ci.mail-canary` per run, `ci.mail-canary.failure` per failure) to PostHog, where the Mail canary dashboard reads
them.

**Starting a run by hand.** On `main`, run the workflow from the Actions tab. To run a PR's own code, add the
`mail-canary` label to the PR; remove and add it again for another run.

## Setup (once)

1. **Space.** With the `dx` CLI on a `preview` profile: `dx account signup --method email <code>
   test@braneframe.com`, `dx space create --name "Mail canary"`, then `dx halo seed` for the recovery phrase. In
   Composer, sign in as the test account and add a Gmail connection with the defaults. Put the space id in
   `canary.yml`.
2. **CI secrets.** `MAIL_CANARY_RECOVERY_PHRASE`; `MAIL_CANARY_GMAIL_{CLIENT_ID,CLIENT_SECRET,REFRESH_TOKEN}` (the
   `gmail.modify` grant of the EDGE dev OAuth client, in 1Password `eng-dev/network.dxos.mail-canary` and
   `eng-dev/com.google`); `MAIL_CANARY_FIXTURES_AGE_KEY` (the agents key, `eng-dev/network.dxos.fixtures`),
   `MAIL_CANARY_R2_TOKEN` (R2 read on `test-fixtures` only) and `CLOUDFLARE_ACCOUNT_ID`.

Locally: `op run --env-file canary/canary.env.tpl -- moon run plugin-google:mail-canary` from
`packages/plugins/plugin-google`. A grant that stops working
shows as class `AUTH`; mint a new refresh token with the same client and scope.
