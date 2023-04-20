<template>
  <div class="demo-controls">
    <div role="none">
      <input v-if="airplaneControl" id="airplane-control" type="checkbox" @change="handleAirplaneToggle" />
      <label>Toggle Replication</label>
    </div>
    <div role="separator" />
    <form v-if="forkable" action="https://codesandbox.io/api/v1/sandboxes/define" method="POST" target="_blank">
      <input type="hidden" name="parameters" :value="parameters" />
      <input type="submit" class="showcase-fork" value="CSB" />
    </form>
    <button v-if="forkable" @click="handleStackblitz">Blitz</button>
  </div>
  <div class="peers">
    <div v-for="i in peerCount" ref="peers"></div>
  </div>
</template>

<style scoped>
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

.peers {
  display: flex;
  width: 100%;
  gap: 1rem;
  margin-block: 1rem;
}

.peers > div {
  flex: 1 0 0;
  width: v-bind('peerWidth');
}
</style>

<script setup lang="ts">
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
