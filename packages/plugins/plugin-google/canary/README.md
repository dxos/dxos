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

## Running it

- **Nightly:** 03:17 UTC, from `main`.
- **By hand on `main`:** run the "Mail canary nightly" workflow from the Actions tab.
- **From a PR's code:** add the `mail-canary` label to the PR. Remove it and add it again for another run.
- **Locally,** from `packages/plugins/plugin-google`. A local run writes to the same mailbox and canary space as the
  nightly job, so do not start one while the nightly job runs:

  ```bash
  # The pool is encrypted to the agents key, so the pull needs that key, not your own.
  DX_FIXTURES_AGE_KEY=<agents key file or op:// reference> moon run fixtures:pull -- enron-pool --scope agents
  op run --env-file canary/canary.env.tpl -- moon run plugin-google:mail-canary
  ```

## Setup

Everything below exists for preview already. Repeat a step only to rebuild or replace that part.

1. **Gmail account.** `test@braneframe.com`, a Google Workspace account. The canary refuses to write with a grant
   for any other account.
2. **Gmail grant.** A refresh token for the EDGE dev OAuth client with the scope
   `https://www.googleapis.com/auth/gmail.modify` and offline access. Sign in to Google as the test account and
   authorize that client, for example in the [OAuth Playground](https://developers.google.com/oauthplayground/)
   with "Use your own OAuth credentials". The current token was minted on 27 October 2026 and still works, so this
   client does not expire tokens after 7 days. A token that stops working shows as class `AUTH`; mint a new one with
   the same client and scope.
3. **Canary identity and space.** With the `dx` CLI on a `preview` profile, run
   `dx account signup --method email <code> test@braneframe.com`, then `dx space create --name "Mail canary"`, then
   `dx halo seed` to get the recovery phrase. In Composer, sign in as that identity, open the space and add a Gmail
   connection for the test account with the defaults. That browser consent is what registers the refresh token in
   kms-service, which stage 2 depends on. Put the space id in `canary.yml` as `spaceId`.
4. **Enron pool.** The `enron-pool` agents fixture in the private `test-fixtures` R2 bucket
   (`agents/enron-pool-20261104-185144.mbox.age`, 39 MB). It is encrypted to the agents key only. It holds 10,000
   distinct messages from three mailboxes of the public CMU Enron corpus (`dasovich-j`, `kaminski-v`, `kean-s`):
   duplicates and messages with an empty body removed, sampled evenly over time. It was built by
   `scripts/mail-canary/01-build-pool.mjs`, which is in git history before commit `85ca8e79`. To replace it, push
   an mbox with every message under 3.5 MB:
   `moon run fixtures:push -- <file>.mbox --name enron-pool --scope agents`. The next run uses the newest version.
5. **GitHub secrets** (repository settings, Secrets and variables, Actions). The workflow reads only these, as
   step environment variables; it never reads 1Password. Copy each value from 1Password once, and again when it
   changes:

   | Secret                                                           | Value                                                     |
   | ---------------------------------------------------------------- | --------------------------------------------------------- |
   | `MAIL_CANARY_RECOVERY_PHRASE`                                    | the canary identity's recovery phrase (step 3)            |
   | `MAIL_CANARY_GMAIL_CLIENT_ID`, `MAIL_CANARY_GMAIL_CLIENT_SECRET` | the EDGE dev OAuth client (step 2)                        |
   | `MAIL_CANARY_GMAIL_REFRESH_TOKEN`                                | the grant from step 2                                     |
   | `MAIL_CANARY_FIXTURES_AGE_KEY`                                   | the agents key that decrypts the pool (step 4)            |
   | `MAIL_CANARY_R2_TOKEN`                                           | a Cloudflare API token that can only read `test-fixtures` |

   `CLOUDFLARE_ACCOUNT_ID`, `COMPOSER_APP_PROD_POSTHOG_API_KEY` and the `MOON_CACHE_*` secrets are shared with other
   workflows and exist already. Without the canary secrets the run step fails at once, naming the missing variables.
6. **Dashboard.** [Mail canary (nightly)](https://eu.posthog.com/project/126171/dashboard/1084272) in PostHog's
   Composer project reads the `ci.mail-canary` events. Nothing to set up beyond the PostHog key above.
