
# @dxos/config
> DXOS config

Load configuration using a simple config folder structure.


## Install

```
$ npm install @dxos/config
```

## Usage

We have a config folder with yml files:

```
config/
├── config.yml
├── defaults.yml
└── envs-map.yml

```

Each file is mapped to its owns type :

```
Dynamics() -> config.yml
Envs() -> envs-map.yml
Defaults() -> defaults.yml
```

The `Dynamics()` config.yml file is *special*, it will be loaded if the `dynamic` property is set to `false`.
If `dynamic` is set to `true` each app will try to load from an endpoint (using `{publicUrl}/.well-known/dx/config`),
`wire app serve` adds config endpoints for each app serving the global config file (`~/.wire/remote.yml`).

Also the `envs-map.yml` is *special*. It provides a map between `process.env` vars and the config paths:

```
PUBLIC_URL:
  path: app.publicUrl
NODE_ENV:
  path: debug.mode
DEBUG:
  path: debug.logging

```

> For web a project with webpack is required.

- Add the `ConfigPlugin` to your webpack plugins (web-only):

```js
const { ConfigPlugin } = require('@dxos/config/ConfigPlugin');

//...

plugins: [
  new ConfigPlugin({
    // PATH TO CONFIG FOLDER
    path: path.resolve(__dirname, 'config'),
    dynamic: process.env.CONFIG_DYNAMIC
  }),
]

```

- Load your configs:

```js
const { Config, LocalStorage, Dynamics, Envs, Defaults } from '@dxos/config`;

export const config = async () => new Config(
  LocalStorage(),
  await Dynamics(),
  Envs(),
  Defaults()
)

```

> Note that config is a function and it should be *awaited*!!!

## API

...

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
