//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { DXN, Filter, Obj, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ title: Schema.optional(Schema.String), pinned: Schema.optional(Schema.Boolean) }),
) {}

// #region nodes
// One node per note, as a child of each space node.
const notes = AppGraphBuilder.createExtension({
  id: 'notes',
  match: AppNodeMatcher.whenSpace,
  connector: (space, get) => {
    const objects = get(space.db.query(Filter.type(Note)).atom);
    return Effect.succeed(
      objects
        .map((object) => AppNode.makeObject({ get, db: space.db, object }))
        .filter((node): node is NonNullable<typeof node> => node !== null),
    );
  },
});
// #endregion

// #region actions
// An action on every node whose data is a Note.
const pin = AppGraphBuilder.createTypeExtension({
  id: 'pin',
  type: Note,
  actions: (note) =>
    Effect.succeed([
      AppGraphNode.makeAction({
        id: 'pin',
        data: () => Effect.sync(() => Obj.update(note, (note) => (note.pinned = !note.pinned))),
        properties: { label: 'Pin', icon: 'ph--push-pin--regular', disposition: 'list-item' },
      }),
    ]),
});
// #endregion

// #region contribute
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([notes, pin]);
    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
// #endregion

// #region path
export const pathOfNote = (note: Note, spaceId: string) => GraphPath.getSpacePath(spaceId, note.id);
// #endregion

// #region read
export const ChildCount = ({ id }: { id: string }) => {
  const { graph } = Hooks.useAppGraph();
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Children are built lazily: expand the node, then read its connections.
    void EffectEx.runPromise(AppGraph.expand(graph, id, AppGraphNode.child)).then(() =>
      setCount(AppGraph.getConnections(graph, id, AppGraphNode.child).length),
    );
  }, [graph, id]);
  return <span>{count}</span>;
};
// #endregion
