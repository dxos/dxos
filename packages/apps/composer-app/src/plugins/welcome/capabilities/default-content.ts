//
// Copyright 2025 DXOS.org
//

import { createIntent, LayoutAction } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { SPACES } from '@dxos/plugin-space';

import { INITIAL_CONTENT, INITIAL_DOC_TITLE } from '../../../constants';

export default async (context: PluginsContext) => {
  const { fullyQualifiedId, create, makeRef } = await import('@dxos/react-client/echo');
  const { ClientCapabilities } = await import('@dxos/plugin-client');
  const { DocumentType } = await import('@dxos/plugin-markdown/types');
  const { CollectionType } = await import('@dxos/plugin-space/types');
  const { TextType } = await import('@dxos/schema');

  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  const { graph } = context.requestCapability(Capabilities.AppGraph);
  const client = context.requestCapability(ClientCapabilities.Client);
  const defaultSpace = client.spaces.default;

  const readme = create(DocumentType, {
    name: INITIAL_DOC_TITLE,
    content: makeRef(create(TextType, { content: INITIAL_CONTENT.join('\n\n') })),
    threads: [],
  });

  const defaultSpaceCollection = defaultSpace.properties[CollectionType.typename].target;
  defaultSpaceCollection?.objects.push(makeRef(readme));

  // Ensure the default content is in the graph and connected.
  // This will allow the expose action to work before the navtree renders for the first time.
  const spacesNode = await graph.waitForNode(SPACES);
  await graph.expand(spacesNode);
  const defaultSpaceNode = await graph.waitForNode(defaultSpace.id);
  await graph.expand(defaultSpaceNode);

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
