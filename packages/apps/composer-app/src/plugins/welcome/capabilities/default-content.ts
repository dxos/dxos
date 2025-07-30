//
// Copyright 2025 DXOS.org
//

import { createIntent, LayoutAction } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { SpaceCapabilities, SpaceEvents, SPACES } from '@dxos/plugin-space';

import { INITIAL_CONTENT, INITIAL_DOC_TITLE } from '../../../constants';

export default async (context: PluginContext) => {
  const { Obj, Ref } = await import('@dxos/echo');
  const { fullyQualifiedId } = await import('@dxos/react-client/echo');
  const { ClientCapabilities } = await import('@dxos/plugin-client');
  const { DocumentType } = await import('@dxos/plugin-markdown/types');
  const { DataType } = await import('@dxos/schema');

  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const { graph } = context.getCapability(Capabilities.AppGraph);
  const client = context.getCapability(ClientCapabilities.Client);
  const defaultSpace = client.spaces.default;

  const readme = Obj.make(DocumentType, {
    name: INITIAL_DOC_TITLE,
    content: Ref.make(
      Obj.make(DataType.Text, {
        content: INITIAL_CONTENT.join('\n\n'),
      }),
    ),
  });

  const defaultSpaceCollection = defaultSpace.properties[DataType.Collection.typename].target;
  defaultSpaceCollection?.objects.push(Ref.make(readme));

  const records = Obj.make(DataType.QueryCollection, {
    query: { typename: DataType.StoredSchema.typename },
  });
  defaultSpaceCollection?.objects.push(Ref.make(records));

  await context.activatePromise(SpaceEvents.SpaceCreated);
  const onSpaceCreatedCallbacks = context.getCapabilities(SpaceCapabilities.OnSpaceCreated);
  const spaceCreatedIntents = onSpaceCreatedCallbacks.map((onSpaceCreated) =>
    onSpaceCreated({ space: defaultSpace, rootCollection: defaultSpaceCollection }),
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
