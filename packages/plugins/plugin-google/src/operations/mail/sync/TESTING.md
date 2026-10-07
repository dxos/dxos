# Live Gmail tests

`sync-live.test.ts` writes labels to a real mailbox, so it is skipped unless credentials are present.
Test account: **`test@braneframe.com`**.

**Use a Desktop-app OAuth client.** It trusts the `http://localhost` loopback redirect automatically,
so there is no redirect URI to register and no OAuth Playground involved. A Web client needs
`https://developers.google.com/oauthplayground` registered before anything works, fails with an
unexplained `redirect_uri_mismatch` until you find that, and then makes you drive the Playground UI by
hand. That path cost ~30 minutes; this one is two commands.

## 1. Create the app (once per Google Cloud project)

- Sign in to Google as the test account.
- Create or pick a project at <https://console.cloud.google.com>.
- Enable the Gmail API: **APIs & Services → Library → "Gmail API" → Enable**, or
  `gcloud services enable gmail.googleapis.com --project <PROJECT_ID>` (which also sidesteps the
  console's "insufficient permissions to check enablement" hiccup).
- **OAuth consent screen** → User type **External** → app name + your email → add the scope
  `https://www.googleapis.com/auth/gmail.modify`. While the app stays in **Testing**, add the test
  account under **Test users** — otherwise only listed users may consent and the refresh token
  expires after 7 days.
- **Credentials → Create credentials → OAuth client ID → Application type: Desktop app.** Copy the
  client id and secret. Desktop is the whole trick: no redirect URI to register.
- Store both in 1Password and reference them from a git-ignored `.env.tpl` beside the script, which
  `op inject` renders at run time so nothing lands in your shell history:
  ```
  export GOOGLE_CLIENT_ID=op://DXOS/google.console.dxos-testing/GOOGLE_CLIENT_ID
  export GOOGLE_CLIENT_SECRET=op://DXOS/google.console.dxos-testing/credential
  ```

## 2. Mint the OAuth token

- Save the downloaded client JSON to `.secrets/client_secret_*.apps.googleusercontent.com.json`
  (keep the name — the test globs for that pattern).
- Obtain a refresh token for the test account and save the token response as `.secrets/gmail.json`.
  Either run the loopback auth tool, which opens the browser once and needs no redirect URI with a
  Desktop client:
  ```bash
  node packages/stories/stories-brain/scripts/google-auth.mjs
  ```
  or, with a Web client, use the OAuth Playground with **Use your own OAuth credentials** ticked and
  **Access type: Offline** (the checkbox is the last line of the gear dialog, above **Close**).
- `src/testing/live-credentials.ts` reads those two files and mints a fresh access token from the
  refresh token on every run, so this is a one-time cost.
- Keep both files between runs — that is the point of a refresh token. Revoke only on a leak or when
  the account is retired.

## Running

```bash
moon run plugin-google:test -- src/operations/mail/sync/sync-live.test.ts
```

The suite skips itself when the credential files are absent, so a normal `moon run plugin-google:test`
is unaffected.

## Notes

- **Never paste credential values into a chat, a shell heredoc, a log, or a commit message.** See
  `AGENTS.md` §"Handing an agent a credential" for the `.secrets/` convention used when a human has to
  hand a file to an agent directly.
- The gate is the presence of both credential files, not `GOOGLE_ACCESS_TOKEN`. That variable already
  arms the read-only `sync-e2e.test.ts`, so reusing it would silently turn an existing read-only setup
  into one that mutates real mail.
- Safety rules the suite enforces: it asserts `getProfile().emailAddress` equals
  `LIVE_GMAIL_ACCOUNT` and **fails** (not skips) on mismatch; it records every message's original
  `labelIds` before touching it and restores them in `afterAll`, throwing if any restore fails rather
  than leaving a shared mailbox modified.

## TODO: promote the auth tool

`google-auth.mjs` lives in `packages/stories/stories-brain/scripts/` and hardcodes `gmail.readonly`.
It is the only Google-auth plumbing in the repo and every live Google test needs it, so it should move
somewhere shared (`tools/google-auth`) with the scope passed in, and `live-credentials.ts` should call
it rather than re-reading `.secrets/` itself. Deferred: the current split works and the consolidation
is not on the critical path for tag sync.
