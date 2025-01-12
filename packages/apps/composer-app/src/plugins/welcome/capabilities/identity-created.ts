//
// Copyright 2025 DXOS.org
//

import { createIntent, LayoutAction, NavigationAction } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { makeRef } from '@dxos/react-client/echo';

import { INITIAL_CONTENT, INITIAL_DOC_TITLE } from '../../../constants';

export default async (context: PluginsContext) => {
  const { fullyQualifiedId, create } = await import('@dxos/react-client/echo');
  const { DocumentType, TextType } = await import('@dxos/plugin-markdown/types');
  const { CollectionType } = await import('@dxos/plugin-space/types');

  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  const client = context.requestCapability(ClientCapabilities.Client);
  await client.spaces.waitUntilReady();

  const defaultSpace = client.spaces.default;
  await defaultSpace.waitUntilReady();

  const readme = create(DocumentType, {
    name: INITIAL_DOC_TITLE,
    content: makeRef(create(TextType, { content: INITIAL_CONTENT.join('\n\n') })),
    threads: [],
  });

  const defaultSpaceCollection = defaultSpace.properties[CollectionType.typename].target as CollectionType;
  defaultSpaceCollection?.objects.push(makeRef(readme));

  await dispatch(createIntent(LayoutAction.SetLayoutMode, { layoutMode: 'solo' }));
  await dispatch(createIntent(NavigationAction.Open, { activeParts: { main: [fullyQualifiedId(readme)] } }));
  await dispatch(createIntent(NavigationAction.Expose, { id: fullyQualifiedId(readme) }));

  return contributes(Capabilities.Null, null);
};
