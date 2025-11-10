//
// Copyright 2025 DXOS.org
//

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Query } from '@dxos/echo';
import { SPACES, SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import README_CONTENT from '../content/README.md?raw';

const SPACE_ICON = 'house-line';

export default async (context: PluginContext) => {
  const { Filter, Obj, Ref } = await import('@dxos/echo');
  const { ClientCapabilities } = await import('@dxos/plugin-client');
  const { Markdown } = await import('@dxos/plugin-markdown/types');
  const { Collection, StoredSchema } = await import('@dxos/schema');

  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const { graph } = context.getCapability(Capabilities.AppGraph);
  const client = context.getCapability(ClientCapabilities.Client);

  const space = client.spaces.default;
  space.properties.icon = SPACE_ICON;

  const readme = Markdown.make({
    name: 'README',
    content: README_CONTENT,
  });

  const defaultSpaceCollection = space.properties[Collection.Collection.typename].target;

  defaultSpaceCollection?.objects.push(Ref.make(readme));
  defaultSpaceCollection?.objects.push(
    Ref.make(
      Obj.make(Collection.QueryCollection, {
        // NOTE: This is specifically Filter.typename due to current limitations in query collection parsing.
        query: Query.select(Filter.typename(StoredSchema.typename)).ast,
      }),
    ),
  );

  await context.activatePromise(SpaceEvents.SpaceCreated);
  const onCreateSpaceCallbacks = context.getCapabilities(SpaceCapabilities.onCreateSpace);
  await Promise.all(
    onCreateSpaceCallbacks
      .map((onCreateSpace) => onCreateSpace({ space: space, rootCollection: defaultSpaceCollection }))
      .map((intent) => dispatch(intent)),
  );

  // Ensure the default content is in the graph and connected.
  // This will allow the expose action to work before the navtree renders for the first time.
  graph.expand(SPACES);
  graph.expand(space.id);

  await dispatch(
    createIntent(LayoutAction.SwitchWorkspace, {
      part: 'workspace',
      subject: space.id,
    }),
  );
  await dispatch(
    createIntent(LayoutAction.SetLayoutMode, {
      part: 'mode',
      subject: Obj.getDXN(readme).toString(),
      options: { mode: 'solo' },
    }),
  );

  return contributes(Capabilities.Null, null);
};
