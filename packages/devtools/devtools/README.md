# DXOS Devtools

DXOS Devtools vite app, which can be run and deployed stand-alone, or packaged as a browser extension.

The `dx.yml` config contains `runtime.client.remoteSource` default endpoint with remote client. 
It is configured to listen for halo-app shared worker (`pnpm nx serve halo-app`).

## Development

Serve the devtools app:

`pnpm -w nx serve devtools`

Then open the testbench: `http://localhost:5173/testbench.html`
