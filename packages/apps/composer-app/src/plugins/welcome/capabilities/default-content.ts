//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, getCollectionsPath, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { Graph, Node } from '@dxos/plugin-graph';
import { SpaceEvents } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space/types';

import README_CONTENT from '../content/README.md?raw';

const SPACE_ICON = 'house-line';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { Obj, Ref } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { Markdown } = yield* Effect.tryPromise(() => import('@dxos/plugin-markdown/types'));
    const { Collection } = yield* Effect.tryPromise(() => import('@dxos/echo'));

    const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
    const { invoke, schedule } = operationInvoker;
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const space = client.spaces.default;
    Obj.change(space.properties, (p) => {
      p.icon = SPACE_ICON;
    });
    const defaultSpaceCollection = space.properties[Collection.Collection.typename].target;

    yield* Plugin.activate(SpaceEvents.SpaceCreated);
    const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
    yield* Effect.all(
      onCreateSpaceCallbacks.map((onCreateSpace) =>
        onCreateSpace({ space: space, isDefault: true, rootCollection: defaultSpaceCollection }).pipe(
          Effect.provideService(Operation.Service, operationInvoker),
        ),
      ),
    );

    const readme = Markdown.make({
      name: 'README',
      content: README_CONTENT,
    });
    space.db.add(readme);

    const gettingStarted = space.db.add(Obj.make(Collection.Collection, { name: 'Getting Started', objects: [] }));
    Obj.change(gettingStarted, (collection) => {
      collection.objects.push(Ref.make(readme));
    });
    Obj.change(defaultSpaceCollection, (collection) => {
      collection.objects.push(Ref.make(gettingStarted));
    });

    // Ensure the default content is in the graph and connected.
    // This will allow the expose action to work before the navtree renders for the first time.
    graph.pipe(Graph.expand(Node.RootId, 'child'), Graph.expand(space.id, 'child'));

    const readmePath = getCollectionsPath(space.id, gettingStarted.id, readme.id);
    yield* invoke(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(space.id) });
    yield* invoke(LayoutOperation.SetLayoutMode, { mode: 'solo', subject: readmePath });
    yield* schedule(LayoutOperation.Expose, { subject: readmePath });
  }),
);
