//
// Copyright 2025 DXOS.org
//

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { SPACES, SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import README_CONTENT from '../content/README.md?raw';

const SPACE_ICON = 'house-line';

export default async (context: PluginContext) => {
  const { Obj, Ref, Type } = await import('@dxos/echo');
  const { ClientCapabilities } = await import('@dxos/plugin-client');
  const { Markdown } = await import('@dxos/plugin-markdown/types');
  const { Collection } = await import('@dxos/schema');

  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const { graph } = context.getCapability(Capabilities.AppGraph);
  const client = context.getCapability(ClientCapabilities.Client);

  const space = client.spaces.default;
  space.properties.icon = SPACE_ICON;
  const defaultSpaceCollection = space.properties[Collection.Collection.typename].target;

  defaultSpaceCollection?.objects.push(Ref.make(Collection.makeManaged({ key: Type.PersistentType.typename })));

  await context.activatePromise(SpaceEvents.SpaceCreated);
  const onCreateSpaceCallbacks = context.getCapabilities(SpaceCapabilities.OnCreateSpace);
  await Promise.all(
    onCreateSpaceCallbacks
      .map((onCreateSpace) => onCreateSpace({ space: space, isDefault: true, rootCollection: defaultSpaceCollection }))
      .map((intent) => dispatch(intent)),
  );

  const readme = Markdown.make({
    name: 'README',
    content: README_CONTENT,
  });
  defaultSpaceCollection?.objects.push(Ref.make(readme));

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
