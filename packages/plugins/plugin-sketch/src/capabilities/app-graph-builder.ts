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

import { Sketch } from '#types';

import { getSketchPath } from '../paths';

const sketchTypename = Type.getTypename(Sketch.Sketch);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      createTypeSectionExtension(Sketch.Sketch),

      GraphBuilder.createExtension({
        id: 'sketchesSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === sketchTypename && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-sketch',
              data: () =>
                Effect.gen(function* () {
                  const sketch = Sketch.make({ canvas: { schema: Sketch.TLDRAW_SCHEMA, content: {} } });
                  yield* Operation.invoke(
                    SpaceOperation.AddObject,
                    { object: sketch, target: space.db },
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(
                    LayoutOperation.Open,
                    { subject: [getSketchPath(space.db.spaceId, sketch.id)] },
                    { spaceId: space.db.spaceId },
                  );
                }),
              properties: {
                label: ['add-object.label', { ns: sketchTypename }],
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
