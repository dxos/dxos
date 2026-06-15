# DXOS Devtools

DXOS Devtools vite app, which can be run and deployed stand-alone, or packaged as a browser extension.

The `dx.yml` config contains `runtime.client.remoteSource` default endpoint with remote client.

## Development

Serve the devtools app:

```bash
moon run devtools:serve
```

Then open the testbench: `http://localhost:5173/testbench.html`

Alternatively, connect devtools to a remote client,
e.g., `http://localhost:5173?target=vault:http://localhost:3967/vault.html`

## Connect to mobile browser

First ensure that local certs are available by following [these instructions](../../../REPOSITORY_GUIDE.md#mobile-development).

The config of the application also needs to be updated to point to the proxy:

```yaml
runtime:
  client:
    remoteSource: https://192.168.0.18:3967/vault.html
    devtoolsProxy: wss://192.168.0.18:8080/host
```

Next, run the proxy socket:

```bash
pnpm run proxy
```

Once the socket is running both devtools and the app can connect to it in order to connect to each other.
The app will know how to connect based on the provided config.
For devtools a target will need to be provided: `https://devtools.dev.dxos.org/?target=wss://192.168.0.18:8080`.
