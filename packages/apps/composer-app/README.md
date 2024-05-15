## Development

To run the app with HALO.

```bash
pnpm -w nx run composer-app:serve
```

## Native Bundling

The app can be bundled to native apps using [Socket Supply, Co.](https://socketsupply.co/) (SSC).

SSC needs to be installed globally:

`npm i -g @socketsupply/socket`

Before running SSC, Composer must be built using:

```bash
DX_HOST=true pnpm -w nx bundle composer-app
```

Then, to bundle the native app, in this directory, run:

`ssc build -r`

This will bundle the app and open it.

To open the app:

`open build/mac/composer-dev.app`

To run against the vite dev server:

```bash
pnpm nx serve composer-app
ssc build -r --port 5173
```

To reset the app, inspect and delete local storage properties.

## Dependencies

To view dependencies and build sizes using bundle buddy, upload pairs of javascript and source map files from
`out/assets` to https://bundle-buddy.com (via the rollup upload).

## Docker

Note: experimental.

The app can be run using Docker.

`docker run -it -p 80:80 dxos/composer-app:latest`

# License

[MIT](https://github.com/dxos/dxos/blob/main/LICENSE) Copyright 2023 © DXOS
