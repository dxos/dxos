---
order: 21
---

<!-- TODO(wittjosiah): Dedupe with ../react/shell.md -->

# Shell

The shell is a set of components and pre-built workflows for managing [ECHO](../platform) spaces, invitations, and identity.

It runs and renders within an iframe managed by the DXOS client.

The shell can be invoked via the client API.

Scenarios:

*   View and edit the user's basic profile
*   Invite someone to a space
*   Accept an invitation to join another space
*   Join another device to the user's HALO identity
*   Accept a device invitation to join the current device to an existing HALO identity

The shell appears overtop the calling UI and looks like a full screen dialog panel.

<div class="shell-images" style="display: flex; flex-direction: row; gap: 2em;">
  <img class="light" src="../react/images/shell-panel-halo-light.png" alt="Shell profile panel" />
  <img class="dark" src="../react/images/shell-panel-halo-dark.png" alt="Shell profile panel" />

  <img class="dark" src="../react/images/shell-panel-halo-device-invite-dark.png" alt="Shell device invitation panel" />
  <img class="light" src="../react/images/shell-panel-halo-device-invite-light.png" alt="Shell device invitation panel" />
</div>

## Installation

```bash
npm i @dxos/shell
```

## Setup

`vite.config.ts`

```ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
      },
    },
  },
});
```

`shell.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
    <style>
      html, body {
        background: transparent !important;
      }
    </style>
    <script>
      function setTheme(darkMode) {
        document.documentElement.classList[darkMode ? 'add' : 'remove']('dark')
      }
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        setTheme(e.matches)
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/shell.ts"></script>
  </body>
</html>
```

`src/shell.ts`

```ts
import '@dxos/shell/style.css';

import { runShell } from '@dxos/shell';

import { getConfig } from './config';

const main = async () => {
  const config = await getConfig();
  await runShell(config);
};

main();
```

## Usage

```tsx file=./snippets/shell.ts#L5-
import { Client, PublicKey } from '@dxos/client';

const client = new Client();
await client.initialize();

// open the profile panel
await client.shell.open();

// join another device using an invitation
const { identity: id1 } = await client.shell.initializeIdentity({
  invitationCode: '<device invitation code>',
});

// open the identity creation flow
const { identity: id2, cancelled } = await client.shell.initializeIdentity();

// invite a new device to join the current identity
const { device } = await client.shell.shareIdentity();

// invite new members to join a space
const { members } = await client.shell.shareSpace({
  spaceKey: PublicKey.from('<space key>'),
});

// join an existing space
const { space } = await client.shell.joinSpace({
  invitationCode: '<invitation code>',
});
```

See more in the [API documentation](../../api/@dxos/client/classes/Client.md#shell) for the Shell.
