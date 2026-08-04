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

`public/.well-known/apple-app-site-association` is what verifies the `org.dxos.composer` app against a
domain — universal links and passkey `webcredentials`. It is a static asset, and asset routing ignores the
hostname, so it is served on every domain mapped to this Worker: composer.space and composer.dxos.org
alike. That is what replaced the standalone `composer-dxos-org` Worker, whose reason for existing was
serving this file. Two consequences:

- composer.dxos.org must stay mapped to this Worker, and whatever redirects it to composer.space must not
  cover `/.well-known/*` — Apple does not follow redirects when fetching the association file.
- A domain also has to be listed in `src-tauri/Entitlements.plist` (`associated-domains`) for the app to
  claim it; serving the file alone is not enough.

Android App Links need `assetlinks.json` alongside it, declaring `org.dxos.composer` and the signing
certificate's SHA-256 fingerprints (`keytool -list -v -keystore <keystore>`). Not written yet — the app
does not ship on Android.

`/.well-known/webauthn` is the exception to all of this: it is a Worker route rather than an asset,
because browsers reject the manifest unless it is served as `application/json`.

## Logs

Tail production logs:

```bash
wrangler tail composer
```
