//
// Copyright 2025 DXOS.org
//

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Filter, Query } from '@dxos/echo';
import { SPACES, SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import { INITIAL_CONTENT, INITIAL_DOC_TITLE } from '../../../constants';

export default async (context: PluginContext) => {
  const { Obj, Ref } = await import('@dxos/echo');
  const { fullyQualifiedId } = await import('@dxos/react-client/echo');
  const { ClientCapabilities } = await import('@dxos/plugin-client');
  const { Markdown } = await import('@dxos/plugin-markdown/types');
  const { DataType } = await import('@dxos/schema');

  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const { graph } = context.getCapability(Capabilities.AppGraph);
  const client = context.getCapability(ClientCapabilities.Client);
  const defaultSpace = client.spaces.default;

  const readme = Markdown.makeDocument({
    name: INITIAL_DOC_TITLE,
    content: INITIAL_CONTENT.join('\n\n'),
  });

  const defaultSpaceCollection = defaultSpace.properties[DataType.Collection.typename].target;
  defaultSpaceCollection?.objects.push(Ref.make(readme));

  const records = Obj.make(DataType.QueryCollection, {
    query: Query.select(Filter.typename(DataType.StoredSchema.typename)).ast,
  });
  defaultSpaceCollection?.objects.push(Ref.make(records));

  await context.activatePromise(SpaceEvents.SpaceCreated);
  const onCreateSpaceCallbacks = context.getCapabilities(SpaceCapabilities.onCreateSpace);
  const spaceCreatedIntents = onCreateSpaceCallbacks.map((onCreateSpace) =>
    onCreateSpace({ space: defaultSpace, rootCollection: defaultSpaceCollection }),
  );
  await Promise.all(spaceCreatedIntents.map((intent) => dispatch(intent)));

  // Ensure the default content is in the graph and connected.
  // This will allow the expose action to work before the navtree renders for the first time.
  graph.expand(SPACES);
  graph.expand(defaultSpace.id);

  await dispatch(
    createIntent(LayoutAction.SwitchWorkspace, {
      part: 'workspace',
      subject: defaultSpace.id,
    }),
  );
  await dispatch(
    createIntent(LayoutAction.SetLayoutMode, {
      part: 'mode',
      subject: fullyQualifiedId(readme),
      options: { mode: 'solo' },
    }),
  );

  return contributes(Capabilities.Null, null);
};
