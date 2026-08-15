# Credentials for the live Gmail tests

`sync-live.test.ts` writes labels to a real mailbox, so it is skipped unless the credential files
below exist. Everything lives in `.secrets/` at the repo root — gitignored at every depth, never
committed. Test account: **`test@braneframe.com`**.

Do this once; the refresh token then mints access tokens indefinitely with no further interaction.

## 1. Create the app (once per Google Cloud project)

- Sign in to Google as the test account.
- Create or pick a project at <https://console.cloud.google.com>.
- Enable the Gmail API: <https://console.cloud.google.com/apis/library/gmail.googleapis.com>.
- **Credentials → Create Credentials → OAuth client ID → Application type: Web application.**
- Under **Authorised redirect URIs**, add exactly `https://developers.google.com/oauthplayground`.
  Skipping this is the failure that reads `redirect_uri_mismatch` later, and nothing earlier warns
  about it.
- If the OAuth consent screen is in **Testing** status, add the test account under **Test users** —
  otherwise the refresh token silently expires after 7 days.
- **Download JSON** and save it to `.secrets/` unchanged, keeping its
  `client_secret_<id>.apps.googleusercontent.com.json` name (the test globs for that pattern).

## 2. Mint the OAuth token

- Open <https://developers.google.com/oauthplayground/>.
- Click the **gear** (top right) → tick **Use your own OAuth credentials** (last line of that dialog,
  above **Close**) → paste the `client_id` and `client_secret` from the file downloaded above.
- Confirm **Access type: Offline** in the same dialog — that is what returns a `refresh_token` rather
  than an access token alone.
- **Step 1** → paste `https://www.googleapis.com/auth/gmail.modify` into _Input your own scopes_ →
  **Authorize APIs** → consent as the test account. One scope is enough: it covers `getProfile`,
  `listLabels`, `getMessage`, `modify` and `batchModify`.
- **Step 2** → **Exchange authorization code for tokens**.
- Save the whole JSON response to `.secrets/gmail.json`. Only `refresh_token` matters long-term; the
  `access_token` in it expires in an hour and the test refreshes on its own.

## Notes

- **Never paste these values into a chat, a shell heredoc, a log, or a commit message.** Write the
  files with an editor under `umask 077` — see `AGENTS.md` §"Handing an agent a credential".
- **Keep the files between runs** — that is the point of the refresh token, and re-minting costs a
  browser round trip. Revoke only when a credential leaks or the account is retired:
  `POST https://oauth2.googleapis.com/revoke` with `token=<refresh_token>` kills the whole grant,
  including access tokens already minted from it.
- The two files are independent: `client_secret_*.json` identifies the app,
  `gmail.json` authorises the account. Both are required — a refresh token cannot be exchanged
  without the client id and secret it was minted under.
