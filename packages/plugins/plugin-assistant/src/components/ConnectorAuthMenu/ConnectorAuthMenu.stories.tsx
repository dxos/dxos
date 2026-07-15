//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useContext, useMemo } from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection, Connector, type ConnectorEntry, connectorAuthActions } from '@dxos/plugin-connector';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import { Graph, useActionRunner } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Menu, isToolbarAction, useGraphMenuActions } from '@dxos/react-ui-menu';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Expando } from '@dxos/schema';

import { translations } from '#translations';

import { ConnectorAuthMenu } from './ConnectorAuthMenu';

/** `connector-b` already has a Connection below, so it renders as a "reuse" entry; `connector-a` has
 * none, so it renders as a "Connect" entry — together they exercise both item kinds and the
 * separator between them. `Default` renders the `ConnectorAuthMenu` component. `Toolbar` feeds the
 * same `connectorAuthActions` atom into an object toolbar the way studio/ibkr/inbox do. */
const CredentialSchema = Schema.Struct({ apiKey: Schema.String.annotations({ title: 'API key' }) });

const makeCredentialForm = (connectorId: string) => ({
  schema: CredentialSchema,
  onSubmit: () => {
    const accessToken = AccessToken.make({ source: `${connectorId}.example`, token: 'mock-token' });
    return Effect.succeed({
      kind: 'complete' as const,
      accessToken,
      connection: Connection.make({ connectorId, accessToken: Ref.make(accessToken) }),
    });
  },
});

const testConnectors: ConnectorEntry[] = [
  {
    id: 'connector-a',
    source: 'connector-a.example',
    label: 'Connector A',
    credentialForm: makeCredentialForm('connector-a'),
  },
  {
    id: 'connector-b',
    source: 'connector-b.example',
    label: 'Connector B',
    credentialForm: makeCredentialForm('connector-b'),
  },
];

const CONNECTOR_IDS = ['connector-a', 'connector-b'];

const ComponentStory = () => {
  const [space] = useSpaces();
  const targets = useQuery(space?.db, Filter.type(Expando.Expando));
  const target = targets[0];

  if (!space || !target) {
    return <Loading />;
  }

  return (
    <div className='p-4'>
      <ConnectorAuthMenu connectorIds={CONNECTOR_IDS} db={space.db} existingTarget={Ref.make(target)} />
    </div>
  );
};

const TOOLBAR_NODE_ID = 'story-toolbar-target';

const ToolbarStory = () => {
  const [space] = useSpaces();
  const registry = useContext(RegistryContext);
  const runAction = useActionRunner();
  const allConnectors = useCapabilities(Connector).flat();
  const allConnections = useQuery(space?.db, Filter.type(Connection.Connection));
  const targets = useQuery(space?.db, Filter.type(Expando.Expando));
  const target = targets[0];

  const graph = useMemo(() => {
    if (!space?.db || !target) {
      return undefined;
    }
    const actions = connectorAuthActions({
      connectorIds: CONNECTOR_IDS,
      db: space.db,
      spaceId: space.db.spaceId,
      existingTarget: Ref.make(target),
      allConnectors,
      allConnections,
    });
    const nextGraph = Graph.make({ registry });
    nextGraph.pipe(
      Graph.addNodes([{ id: TOOLBAR_NODE_ID, type: 'story/toolbar-target', data: null, properties: {}, actions }]),
    );
    return nextGraph;
  }, [registry, space, target, allConnectors, allConnections]);

  const menuActions = useGraphMenuActions(graph, TOOLBAR_NODE_ID, { filter: isToolbarAction });

  if (!space || !target) {
    return <Loading />;
  }

  return (
    <div className='p-4 border border-separator rounded-sm'>
      <Menu.Root {...menuActions} onAction={runAction} attendableId={TOOLBAR_NODE_ID} alwaysActive>
        <Menu.Toolbar />
      </Menu.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ConnectorAuthMenu',
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      capabilities: [Capability.contributes(Connector, testConnectors)],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Connection.Connection, Cursor.Cursor, Expando.Expando],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              // `connector-b` already has a connection — offered for reuse.
              const accessToken = AccessToken.make({ source: 'connector-b.example', token: 'mock-token' });
              space.db.add(
                Connection.make({
                  name: 'Existing Connector B',
                  connectorId: 'connector-b',
                  accessToken: Ref.make(accessToken),
                }),
              );
              // Local target the reuse/connect flow would bind a new sync target to.
              space.db.add(Obj.make(Expando.Expando, { name: 'Target Object' }));

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...connectorTranslations],
  },
} satisfies Meta<React.ComponentType>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: ComponentStory };

export const Toolbar: Story = { render: ToolbarStory };
