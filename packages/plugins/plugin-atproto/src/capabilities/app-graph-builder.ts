//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { GraphBuilder, Node, type NodeMatcher } from '@dxos/plugin-graph';
import { Connection } from '@dxos/plugin-connector';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import { getRecordAnnotation } from '../annotation';
import { isAtprotoConnection } from '../connection';
import { PDS_NODE_TYPE } from '../pds';

/** The companion segment/variant for the publishing companion — shared with its surface binding. */
export const ATPROTO_COMPANION_VARIANT = 'atproto';

/**
 * Matches an object node when BOTH hold: (a) the object's type carries an atproto record annotation,
 * and (b) its space holds an atproto connection. Reactive via `get(...atom)`, so the companion
 * appears/disappears as connections are added or removed.
 */
const whenPublishable: NodeMatcher.NodeMatcher<Obj.Unknown> = (node, get) => {
  if (!Obj.isObject(node.data)) {
    return Option.none();
  }
  const object = node.data;
  if (!getRecordAnnotation(object)) {
    return Option.none();
  }
  const db = Obj.getDatabase(object);
  if (!db) {
    return Option.none();
  }
  const hasAtprotoConnection = get(db.query(Filter.type(Connection.Connection)).atom).some(isAtprotoConnection);
  return hasAtprotoConnection ? Option.some(object) : Option.none();
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'atprotoCompanion',
        match: whenPublishable,
        connector: (object) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment(ATPROTO_COMPANION_VARIANT),
              label: ['companion.label', { ns: meta.profile.key }],
              icon: 'ph--broadcast--regular',
              data: object,
            }),
          ]),
      }),

      // Virtual "PDS" node in the system section — only when the space holds an atproto connection.
      // Positioned between Database (0) and Devtools (Infinity).
      GraphBuilder.createExtension({
        id: 'pdsSection',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.system),
        connector: (space, get) => {
          const hasAtprotoConnection = get(space.db.query(Filter.type(Connection.Connection)).atom).some(
            isAtprotoConnection,
          );
          if (!hasAtprotoConnection) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            Node.make({
              // Segment id (no '/'); the graph qualifies it under the space's system group.
              id: PDS_NODE_TYPE,
              type: PDS_NODE_TYPE,
              data: { type: PDS_NODE_TYPE, space },
              properties: {
                label: ['pds-section.label', { ns: meta.profile.key }],
                icon: 'ph--hard-drives--regular',
                position: 100,
                selectable: true,
                draggable: false,
                droppable: false,
                space,
              },
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
