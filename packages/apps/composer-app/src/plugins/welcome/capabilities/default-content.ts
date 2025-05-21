//
// Copyright 2025 DXOS.org
//

import { createIntent, LayoutAction } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { SPACES } from '@dxos/plugin-space';

import { INITIAL_CONTENT, INITIAL_DOC_TITLE } from '../../../constants';

export default async (context: PluginContext) => {
  const { fullyQualifiedId, live, Ref } = await import('@dxos/react-client/echo');
  const { ClientCapabilities } = await import('@dxos/plugin-client');
  const { DocumentType } = await import('@dxos/plugin-markdown/types');
  const { CollectionType } = await import('@dxos/plugin-space/types');
  const { DataType } = await import('@dxos/schema');

  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const { graph } = context.getCapability(Capabilities.AppGraph);
  const client = context.getCapability(ClientCapabilities.Client);
  const defaultSpace = client.spaces.default;

  const readme = live(DocumentType, {
    name: INITIAL_DOC_TITLE,
    content: Ref.make(
      live(DataType.Text, {
        content: INITIAL_CONTENT.join('\n\n'),
      }),
    ),
    assistantChatQueue: Ref.fromDXN(
      new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, defaultSpace.id, Type.ObjectId.random()]),
    ),
    threads: [],
  });

  const defaultSpaceCollection = defaultSpace.properties[CollectionType.typename].target;
  defaultSpaceCollection?.objects.push(Ref.make(readme));

  // Ensure the default content is in the graph and connected.
  // This will allow the expose action to work before the navtree renders for the first time.
  graph.expand(SPACES);
  graph.expand(defaultSpace.id);

  await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: defaultSpace.id }));
  await dispatch(
    createIntent(LayoutAction.SetLayoutMode, {
      part: 'mode',
      subject: fullyQualifiedId(readme),
      options: { mode: 'solo' },
    }),
  );

  return contributes(Capabilities.Null, null);
};
