<template>
  <form v-if="forkable" action="https://codesandbox.io/api/v1/sandboxes/define" method="POST" target="_blank">
    <input type="hidden" name="parameters" :value="parameters" />
    <input type="submit" class="showcase-fork" value="Fork" />
  </form>
  <input v-if="airplaneControl" id="airplane-control" type="checkbox" @change="handleAirplaneToggle" />
  <label>Toggle Replication</label>
  <div class="peers">
    <div v-for="i in peerCount" ref="peers"></div>
  </div>
</template>

<style scoped>
.showcase-fork {
  position: absolute;
  right: 1em;
  cursor: pointer;
}

.peers {
  display: flex;
}

.peers>div {
  width: v-bind('peerWidth');
}
</style>

<script setup lang='ts'>
  import { getParameters } from 'codesandbox-import-utils/lib/api/define';
  import { createElement } from 'react';
  import { createRoot } from 'react-dom/client';
  import { onMounted, ref } from 'vue';

  import { Trigger } from '@dxos/async';
  import { Client, fromHost, Invitation, PublicKey } from '@dxos/client';
  import { TestBuilder } from '@dxos/client/testing';
  import { log } from '@dxos/log';
  import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
  import { ClientProvider, useSpaces } from '@dxos/react-client';

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

  const peers = ref<HTMLDivElement[]>([])
  const peerWidth = `${100 / props.peerCount}%`;

  // Note rollup dynamic import limitations.
  //   https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  const module = await import(`../demos/${props.demo}.tsx`);
  const parameters = getParameters({
    files: {
      'patches/vite+4.0.4.patch': {
        content: (await import('../templates/codesandbox/patches/vite+4.0.4.patch?raw')).default,
        isBinary: false
      },
      'src/App.tsx': {
        content: (await import(`../demos/${props.demo}.tsx?raw`)).default,
        isBinary: false
      },
      'src/main.tsx': {
        content: (await import('../templates/codesandbox/src/main.tsx?raw')).default,
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
  const clients = [...Array(props.peerCount)].map(() =>
    new Client({ services: testBuilder.createClientServicesHost() })
  );

  await Promise.all(clients.map((client) => client.initialize()));
  log('clients initialized');

  if (props.createIdentity) {
    await Promise.all(clients.map((client) => client.halo.createProfile()));
    log('identities created');
  }

  if (props.createSpace) {
    const space = await clients[0].echo.createSpace();
    log('space created', { key: space.key });

    await Promise.all(
      clients.slice(1).map(async (client) => {
        const success1 = new Trigger<Invitation>();
        const success2 = new Trigger<Invitation>();

        const observable1 = space.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
        log('invitation created');
        observable1.subscribe({
          onConnecting: (invitation) => {
            const observable2 = client.echo.acceptInvitation(invitation);
            log('invitation accepted');

            observable2.subscribe({
              onSuccess: (invitation: Invitation) => {
                success2.wake(invitation);
                log('invitation success2');
              },
              onError: (err: Error) => raise(err)
            });
          },
          onSuccess: (invitation) => {
            success1.wake(invitation);
            log('invitation success1');
          },
          onError: (err) => raise(err)
        });

        await Promise.all([success1.wait(), success2.wait()]);
      })
    );
  }

  const handleAirplaneToggle = async (event) => {
    const mode = event.target.checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
    await Promise.all(clients.map((client) => client.mesh.setConnectionState(mode)));
  };

  const SpaceWrapper = () => {
    const [space] = useSpaces();

    return createElement(module.default, { space }, null);
  };

  onMounted(() => {
    peers.value.forEach((peer, i) => {
      createRoot(peer)
        .render(
          createElement(
            ClientProvider,
            { client: clients[i] }, 
            createElement(SpaceWrapper, {}, null)
          )
        );
    });
  });
</script>
