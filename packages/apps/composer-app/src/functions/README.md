# Cloudflare Worker

`_worker.ts` is the Worker entry (see `wrangler.jsonc`); static assets are served via the `ASSETS` binding.

NOTE: Separate `tsconfig.json` for server-side code.

## Development

Build the bundle from root:

```bash
moon run composer-app:bundle
```

Run the Worker from the app directory:

```bash
wrangler dev
```

## Domain verification

`WELL_KNOWN_DOCUMENTS` in `_worker.ts` serves what verifies this domain: `apple-app-site-association`
(universal links and passkey `webcredentials` for `org.dxos.composer`) and `webauthn` (Related Origin
Requests). Both are Worker routes rather than static assets, because they must be served as
`application/json` and their paths carry no extension for the asset server to infer that from.

Routing ignores the hostname, so every domain mapped to this Worker is verified by the same documents —
composer.space and composer.dxos.org alike. That is what replaced the standalone `composer-dxos-org`
Worker, whose reason for existing was serving the association file. Two consequences:

- composer.dxos.org is a Custom Domain on this Worker so these documents resolve there; a Redirect Rule on
  the dxos.org zone sends its other traffic to composer.space and must exclude `/.well-known/*`, since
  Apple does not follow redirects when fetching the association file.
- A domain also has to be listed in `src-tauri/Entitlements.plist` (`associated-domains`) for the app to
  claim it; serving the document alone is not enough.
- The app id is `<APPLE_TEAM_ID>.org.dxos.composer`, with the team id coming from the `APPLE_TEAM_ID` var
  in `wrangler.jsonc` — repeated per environment, since vars are not inherited. A deploy missing it
  answers 503 rather than serving a document that would un-verify the domain.

Android App Links need an `assetlinks.json` entry alongside them, declaring `org.dxos.composer` and the
signing certificate's SHA-256 fingerprints (`keytool -list -v -keystore <keystore>`). Not written yet —
the app does not ship on Android.

## Logs

Tail production logs:

```bash
wrangler tail composer
```
