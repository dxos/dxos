<template>
  <div class="demo-controls">
    <label>
      <input v-if="airplaneControl" id="airplane-control" type="checkbox" @change="handleAirplaneToggle" />
      Disable <a href="/guide/platform/">replication</a> (go offline)
    </label>
    <div role="separator" />
    <vue-custom-tooltip v-if="forkable" label="Fork to Stackblitz">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256" @click="handleStackblitz">
        <path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path>
      </svg>
    </vue-custom-tooltip>
    <!-- TODO(wittjosiah): CodeSandbox forking requires too many extra steps for it to work currently. -->
    <!-- <form v-if="forkable" ref="codesandbox" action="https://codesandbox.io/api/v1/sandboxes/define" method="POST" target="_blank">
      <input type="hidden" name="parameters" :value="parameters" />
      <vue-custom-tooltip v-if="forkable" label="Fork to CodeSandbox">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256" @click="handleCodesandbox">
          <path d="M223.68,66.15,135.68,18a15.94,15.94,0,0,0-15.36,0l-88,48.18a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM168,152v50.09l-32,17.52V132.74l80-43.8v32l-43.84,24A8,8,0,0,0,168,152Zm-84.16-7L40,121v-32l80,43.8v86.87L88,202.09V152A8,8,0,0,0,83.84,145Zm-.7-88.41,41,22.45a8,8,0,0,0,7.68,0l41-22.45,34.48,18.87L128,118.88,48.66,75.44ZM128,32h0l28.2,15.44L128,62.89,99.8,47.45ZM40,139.22l32,17.52v36.59L40,175.82Zm144,54.11V156.74l32-17.52v36.6Z"></path>
        </svg>
      </vue-custom-tooltip>
    </form> -->
  </div>
  <div class="peers">
    <div v-for="i in peerCount" ref="peers"></div>
  </div>
</template>

<style>
.demo-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 1rem;
}

.demo-controls form {
  display: contents;
}

.demo-controls [role='separator'] {
  flex-grow: 1;
}

.demo-controls path {
  fill: var(--text-color-light);
}

.peers {
  display: flex;
  width: 100%;
  gap: 1rem;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.peers > div {
  flex: 1 0 0;
  width: v-bind('peerWidth');
}

/* TODO(wittjosiah): This is not generalized. */
.task-list > [role='heading'] {
  display: block;
  margin-block: 0 0.5rem;
  font-size: inherit;
}

.task-list > input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  line-height: 1.6;
  font-size: 18px;
}

.task-list > [role='list'] > [role='listitem'] {
  display: flex;
  align-items: center;
  margin-block: 0.5rem;
  gap: 0.5rem;
}

.task-list > [role='list'] > [role='listitem'] > input,
.task-list > [role='list'] > [role='listitem'] > button {
  flex: 0 0 auto;
}

.task-list > [role='list'] > [role='listitem'] > p {
  margin: 0;
  flex: 1 0 0;
}

.task-list > [role='list'] > [role='listitem'] > button {
  height: 1.2rem;
  width: 1.2rem;
  padding: 0;
}
</style>

<script setup lang="ts">
import VueCustomTooltip from '@adamdehaven/vue-custom-tooltip';
import sdk from '@stackblitz/sdk';
import { getParameters } from 'codesandbox-import-utils/lib/api/define';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { onMounted, ref } from 'vue';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

const props = defineProps({
  demo: {
    type: String,
    required: true
  },
  peerCount: {
    type: Number
  },
  airplaneControl: {
    type: Boolean
  },
  forkable: {
    type: Boolean
  },
  createIdentity: {
    type: Boolean
  },
  createSpace: {
    type: Boolean
  }
});

const codesandbox = ref<HTMLFormElement>();
const peers = ref<HTMLDivElement[]>([]);
const peerWidth = `${100 / props.peerCount}%`;

// TODO(wittjosiah): Prevent from importing during ssr.
const { Client, fromHost, Invitation, PublicKey } = await import('@dxos/client');
const { performInvitation, TestBuilder } = await import('@dxos/client-services/testing');
const { ClientProvider, useSpaces } = await import('@dxos/react-client');

// Note rollup dynamic import limitations.
//   https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
const module = await import(`../demos/${props.demo}.tsx`);
const parameters = getParameters({
  files: {
    '.codesandbox/Dockerfile': {
      content: 'FROM node:18-bullseye',
      isBinary: false
    },
    'src/Demo.tsx': {
      content: (await import(`../demos/${props.demo}.tsx?raw`)).default,
      isBinary: false
    },
    // TODO(wittjosiah): This is not generalized.
    'src/proto/schema.proto': {
      content: (await import('../demos/proto/schema.proto?raw')).default,
      isBinary: false
    },
    'src/proto/index.ts': {
      content: (await import('../demos/proto/index.ts?raw')).default,
      isBinary: false
    },
    'src/App.tsx': {
      content: (await import('../templates/codesandbox/src/App.tsx?raw')).default,
      isBinary: false
    },
    'src/main.tsx': {
      content: (await import('../templates/codesandbox/src/main.tsx?raw')).default,
      isBinary: false
    },
    'dx.yml': {
      content: (await import('../templates/codesandbox/dx.yml?raw')).default,
      isBinary: false
    },
    'index.html': {
      content: (await import('../templates/codesandbox/index.html?raw')).default,
      isBinary: false
    },
    'package.json': {
      content: (await import('../templates/codesandbox/package.json?raw')).default,
      isBinary: false
    },
    'tsconfig.json': {
      content: (await import('../templates/codesandbox/tsconfig.json?raw')).default,
      isBinary: false
    },
    'tsconfig.node.json': {
      content: (await import('../templates/codesandbox/tsconfig.node.json?raw')).default,
      isBinary: false
    },
    'vite.config.ts': {
      content: (await import('../templates/codesandbox/vite.config.ts?raw')).default,
      isBinary: false
    }
  }
});

const testBuilder = new TestBuilder();
const clients = [...Array(props.peerCount)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));

await Promise.all(clients.map((client) => client.initialize()));
log('clients initialized');

if (props.createIdentity) {
  await Promise.all(clients.map((client) => client.halo.createIdentity()));
  log('identities created');
}

if (props.createSpace) {
  const space = await clients[0].createSpace();
  log('space created', { key: space.key });
  await Promise.all(clients.slice(1).map((client) => performInvitation({ host: space, guest: client })));
  log('invitations completed');
}

const handleAirplaneToggle = async (event) => {
  const mode = event.target.checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
  await Promise.all(clients.map((client) => client.mesh.setConnectionState(mode)));
};

const handleCodesandbox = () => {
  codesandbox.value.submit();
};

const handleStackblitz = async () => {
  sdk.openProject({
    title: 'Demo',
    template: 'node',
    files: {
      'src/Demo.tsx': (await import(`../demos/${props.demo}.tsx?raw`)).default,
      // TODO(wittjosiah): This is not generalized.
      'src/proto/schema.proto': (await import('../demos/proto/schema.proto?raw')).default,
      'src/proto/index.ts': (await import('../demos/proto/index.ts?raw')).default,
      'src/App.tsx': (await import('../templates/codesandbox/src/App.tsx?raw')).default,
      'src/main.tsx': (await import('../templates/codesandbox/src/main.tsx?raw')).default,
      'dx.yml': (await import('../templates/codesandbox/dx.yml?raw')).default,
      'index.html': (await import('../templates/codesandbox/index.html?raw')).default,
      'package.json': (await import('../templates/codesandbox/package.json?raw')).default,
      'tsconfig.json': (await import('../templates/codesandbox/tsconfig.json?raw')).default,
      'tsconfig.node.json': (await import('../templates/codesandbox/tsconfig.node.json?raw')).default,
      'vite.config.ts': (await import('../templates/codesandbox/vite.config.ts?raw')).default
    }
  });
};

const SpaceWrapper = ({ clientIndex }: { clientIndex: number }) => {
  const [space] = useSpaces();

  return createElement(module.default, { space, clientIndex }, null);
};

onMounted(() => {
  peers.value.forEach((peer, i) => {
    createRoot(peer).render(
      createElement(ClientProvider, { client: clients[i] }, createElement(SpaceWrapper, { clientIndex: i }, null))
    );
  });
});
</script>
