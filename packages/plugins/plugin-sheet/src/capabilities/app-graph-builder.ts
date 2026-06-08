//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, createTypeSectionExtension } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';

import { Sheet } from '#types';

import { getSheetPath } from '../paths';

const sheetTypename = Type.getTypename(Sheet.Sheet);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      createTypeSectionExtension(Sheet.Sheet),

      GraphBuilder.createExtension({
        id: 'sheetsSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === sheetTypename && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-sheet',
              data: () =>
                Effect.gen(function* () {
                  const sheet = Sheet.make({});
                  yield* Operation.invoke(
                    SpaceOperation.AddObject,
                    { object: sheet, target: space.db },
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(
                    LayoutOperation.Open,
                    { subject: [getSheetPath(space.db.spaceId, sheet.id)] },
                    { spaceId: space.db.spaceId },
                  );
                }),
              properties: {
                label: ['add-object.label', { ns: sheetTypename }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
