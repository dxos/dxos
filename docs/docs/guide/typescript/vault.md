---
order: 21
---

# Development Vault

When running in the browser, by default the `Client` will connect to the vault stored on the `halo.dxos.org` domain.
However when developing an app you may not want to utilize your primary identity for testing or you may want to ensure you can develop offline.
For these purposes you can install the same vault which HALO serves as a dev dependency and run a test vault locally beside your app.

::: note
To learn more about the vault architecture, see the [vault topology](../platform/#local-vault-topology).
:::

## Installation

```bash
npm install --save-dev @dxos/vault
```

## Usage

The vault runs an http server on localhost port 3967 (DXOS).

### Config

When running with the development vault the client needs to be configured to look locally for its remote source.
To do this create a [`dx-dev.yml` file](./config#dynamic-app-configuration-from-kube) with the following config:

```yml
version: 1

runtime:
  client:
    remoteSource: http://localhost:3967/vault.html
```

### Vite Plugin

If using Vite, the easiest way to start the vault alongside your app is to use vault's Vite plugin:

```ts
import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { VaultPlugin } from '@dxos/vault/vite-plugin';

export default defineConfig({
  ...
  plugins: [
    ConfigPlugin(),
    VaultPlugin()
  ]
});
```

### Vanilla

If using a bundler other than Vite, vault provides a simple command to start it alongside the dev server:

```json
{
  "scripts": {
    "start": "concurrently \"dx-vault\" \"webpack serve\""
  },
  "devDependencies": {
    "@dxos/vault": "latest",
    "concurrently": "^8.0.0",
    "webpack": "^5.0.0"
  }
}
```
