## Development

To run the app with HALO.

```bash
pnpm -w nx run composer-app:serve-with-vault
```

## Native Bundling

The app can be bundled to native apps using [Socket Supply, Co.](https://socketsupply.co/) (SSC).

SSC needs to be installed globally:

`npm i @socketsupply/socket -g`

Before running SSC, Composer must be built using:

`pnpm nx bundle composer-app`

Then, to bundle the native app, in this directory, run:

`ssc build -r`

This will bundle the app and open it.
