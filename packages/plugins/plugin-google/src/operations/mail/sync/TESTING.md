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

- Run the auth tool. It opens the browser once for consent, then saves the refresh token locally
  (git-ignored, mode `600`):
  ```bash
  node packages/stories/stories-brain/scripts/google-auth.mjs
  ```
- Every later run mints an access token from that refresh token with no browser interaction:
  ```bash
  node packages/stories/stories-brain/scripts/google-auth.mjs --token
  ```
- `--force` re-consents; `--revoke` revokes the grant at Google and deletes the local token.
- Keep the refresh token between runs — that is the point of it. Revoke only on a leak or when the
  account is retired.

## Notes

- **Never paste credential values into a chat, a shell heredoc, a log, or a commit message.** See
  `AGENTS.md` §"Handing an agent a credential" for the `.secrets/` convention used when a human has to
  hand a file to an agent directly.
- The gate is the presence of a usable refresh token, not `GOOGLE_ACCESS_TOKEN`. That variable already
  arms the read-only `sync-e2e.test.ts`, so reusing it would silently turn an existing read-only setup
  into one that mutates real mail.
- Safety rules the live test itself enforces: assert `getProfile().emailAddress` matches the expected
  account and **fail** (not skip) on mismatch; touch only messages the test created; restore original
  `labelIds` in a `finally`, surfacing cleanup failures rather than swallowing them.

## TODO: promote the auth tool

`google-auth.mjs` lives in `packages/stories/stories-brain/scripts/` and hardcodes
`gmail.readonly`. It is the only piece of Google-auth plumbing in the repo and every live Google test
needs it, so it should move somewhere shared (`tools/google-auth`) with the scope passed in. Until
then this doc points at its current path, and the scope constant needs widening to `gmail.modify` for
the write tests.
