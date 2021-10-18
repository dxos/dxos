# DXOS Wallet Extension

## Development

1. Run `rushx build:watch`
2. Load unpacked `build` directory in the browser's extensions.

## Create installer for Mozilla Firefox

### Setting up Mozilla Firefox

To be able to install unverified add-on you need to use [Mozilla Firefox Developer Edition](https://www.mozilla.org/pl/firefox/developer/). When you have it installed, navigate to [about:config](about:config) and change *xpinstall.signatures.required* parameter to *False*. You may need to reload browser afterwards. 

### Create installation file

In root folder of the monorepo, run

```bash
  rush update && rush build
  cd packages/wallet/extension/dist
  zip -r wallet.xpi *
```

After this step *wallet.xpi* will be available in dist folder. You can then drag the file onto Firefox window and agree to install the add-on.
