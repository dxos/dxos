//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Graph } from '@dxos/plugin-graph';
import { SPACES, SpaceEvents } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space/types';

import README_CONTENT from '../content/README.md?raw';

const SPACE_ICON = 'house-line';

export default Capability.makeModule((context) =>
  Effect.gen(function* () {
    const { Obj, Ref, Type } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { Markdown } = yield* Effect.tryPromise(() => import('@dxos/plugin-markdown/types'));
    const { Collection } = yield* Effect.tryPromise(() => import('@dxos/schema'));

    const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
    const { graph } = context.getCapability(Common.Capability.AppGraph);
    const client = context.getCapability(ClientCapabilities.Client);

    const space = client.spaces.default;
    space.properties.icon = SPACE_ICON;
    const defaultSpaceCollection = space.properties[Collection.Collection.typename].target;

    defaultSpaceCollection?.objects.push(
      Ref.make(Collection.makeManaged({ key: Type.getTypename(Type.PersistentType) })),
    );

    yield* context.activate(SpaceEvents.SpaceCreated);
    const onCreateSpaceCallbacks = context.getCapabilities(SpaceCapabilities.OnCreateSpace);
    yield* Effect.all(
      onCreateSpaceCallbacks.map((onCreateSpace) =>
        onCreateSpace({ space: space, isDefault: true, rootCollection: defaultSpaceCollection }),
      ),
    );

    const readme = Markdown.make({
      name: 'README',
      content: README_CONTENT,
    });
    defaultSpaceCollection?.objects.push(Ref.make(readme));

    // Ensure the default content is in the graph and connected.
    // This will allow the expose action to work before the navtree renders for the first time.
    graph.pipe(Graph.expand(SPACES), Graph.expand(space.id));

    yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: space.id });
    yield* invoke(Common.LayoutOperation.SetLayoutMode, {
      mode: 'solo',
      subject: Obj.getDXN(readme).toString(),
    });
  }),
);
