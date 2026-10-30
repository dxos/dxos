# Mail canary

A nightly end-to-end check of Gmail sync on **preview** EDGE. It uses a real account
(`test@braneframe.com`), the real OAuth path (the token stays in kms-service) and the product's own
`*/10` sync trigger, so it fails where users' sync fails. Design: the
[Mail Sync Canary spec](https://claude.ai/artifact/GymNuUNJiiph2LuiDNZani).

## How it works

- **Pool.** 1,000 Enron messages sit in the inbox under `enron-pool`, the only label the canary uses.
- **Space.** A preview identity owns a space bound to the account with the defaults users get.
- **Nightly** (`.github/workflows/mail-canary-nightly.yml`, `moon run plugin-google:mail-canary`). It
  copies the 100 oldest pool messages into the inbox as new mail and trashes the originals, waits up to
  45 minutes for the space's sync to pick the copies up, then checks the last 25 hours of the Execution
  Trace feed and tonight's copies. It writes `report.json`, `summary.json` and `summary.md`, and posts one
  `ci.mail-canary` PostHog event: alert on `ok = false` and on no event for 26 hours.

| Check | Fails when                                                 | Classes        |
| ----- | ---------------------------------------------------------- | -------------- |
| C1    | an invocation started and has no end after 10 minutes      | KILL           |
| C2    | an invocation failed (a `runAgain` yield is not a failure) | from the error |
| C3    | no invocation for the cron interval plus 2 minutes         | IDLE           |
| C4    | the sync trigger is missing or disabled                    | OFF            |
| C5    | a copy is still not in the mailbox feed when the wait ends | DATA, STALL    |
| C6    | a Gmail message appears twice in the mailbox feed          | DATA           |
| C7    | a synced copy's subject or sender differs from Gmail's     | DATA           |

The nightly reads the space through an in-process `@dxos/client` that recovers the identity from its
phrase, so each run adds one device to the identity; no device key is kept between runs.

## Setup (once)

Run from `packages/plugins/plugin-google`. The grant (`gmail.modify`, minted with the EDGE dev OAuth client
in 1Password `eng-dev/com.google`, section `dev`) is in `eng-dev/network.dxos.mail-canary`.

1. **Pool.** Import the pool mbox (the private fixture `enron-pool`, see the `private-fixtures` skill)
   before the space exists: a syncing space takes imported mail as new.
   `op run --env-file canary/gmail.env.tpl -- vite-node canary/setup.ts import <pool.mbox>`
2. **Space.** With the `dx` CLI on a `preview` profile: `dx account signup --method email <code>
   test@braneframe.com`, `dx space create --name "Mail canary"`, then `dx halo seed` for the recovery
   phrase. In Composer, sign in as the test account and add a Gmail connection with the defaults.
3. **Verify.** `MAIL_CANARY_RECOVERY_PHRASE=... vite-node canary/setup.ts verify <space id>`.
4. **CI.** Secrets `MAIL_CANARY_RECOVERY_PHRASE` and `MAIL_CANARY_GMAIL_{CLIENT_ID,CLIENT_SECRET,REFRESH_TOKEN}`,
   variable `MAIL_CANARY_SPACE_ID`.

A grant that stops working (revoked, password changed, unused for six months) shows as class `AUTH`; mint
a new refresh token with the same client and scope and update the secrets.
