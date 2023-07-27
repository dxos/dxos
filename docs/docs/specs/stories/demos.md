# Explainers

### Reset

- Browser (or use incognito):
  - Open https://labs.dev.dxos.org
  - Select Debug plugin.
  - Open Devtools.
  - Select storage tab then click reset.
  - Reload app.
- CLI
  - `dx agent stop --all`
  - `dx reset --force`
  - `dx agent list`

### Join CLI to browser HALO

- Browser
  - Open Composer and create an identity.
  - Select "Add a device" from the main menu.
- CLI
  - `dx halo join`
  - `dx device list`
  - `dx space list`

### Devtools

- CLI
  - `dx debug stats --json`
  - `dx agent stop`
  - `dx agent start -f --ws=5001`
- Browser
  - Open https://devtools.dxos.org?target=ws://localhost:5001
  - Open https://devtools.dxos.org
  - Open https://labs.dev.dxos.org
    - Select Debug plugin; open Devtools.

### Functions

- CLI
  - `dx function dev-server -r ts-node/register --verbose`
  - `curl -X POST http://localhost:7001/dev/hello -H 'Content-Type: application/json' -w '\n' -d '{ "message": "Hello World!" }'`
- Browser
  - Create thread.
  - Enter message (see GPT response).
