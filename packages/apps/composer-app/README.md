## Development

To run the app:

```bash
moon run composer-app:serve
```

## Native Bundling

The app can be bundled to native apps using [Socket Supply, Co.](https://socketsupply.co/) (SSC).

SSC needs to be installed globally:

`npm i -g @socketsupply/socket`

Before running SSC, Composer must be built using:

```bash
DX_HOST=true moon run composer-app:bundle
```

Then, to bundle the native app, in this directory, run:

`ssc build -r`

This will bundle the app and open it.

To open the app:

`open build/mac/composer-dev.app`

To run against the vite dev server:

```bash
moon run composer-app:serve
ssc build -r --port 5173
```

To reset the app, inspect and delete local storage properties.

## iOS Development

- TODO(burdon): Create profile.
- TODO(burdon): Create cert in keychain.
- TODO(burdon): ini template for different profiles?

- Install the App Configurator from the App Store.
- Tether device via USB cable.

```bash
# Socket bug: need to create directory.
mkdir -p /Users/burdon/Library/MobileDevice/Provisioning\ Profiles
ssc build --platform=ios -p -c
ssc list-devices --platform ios
ssc install-app --platform ios
```

## Dependencies

To view dependencies and build sizes using bundle buddy, upload pairs of javascript and source map files from
`out/assets` to https://bundle-buddy.com (via the rollup upload).

## Docker

Note: experimental.

The app can be run using Docker.

`docker run -it -p 80:80 dxos/composer-app:latest`

# License

[MIT](https://github.com/dxos/dxos/blob/main/LICENSE) Copyright 2023 © DXOS
