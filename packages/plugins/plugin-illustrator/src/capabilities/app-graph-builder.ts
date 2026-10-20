//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';

import { meta } from '#meta';
import { Drawing, DrawingOperation, IllustratorCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the actions appear once renderer plugins contribute their variants.
    const variantsAtom = yield* Capability.atom(IllustratorCapabilities.VariantProvider);

    const companion = yield* AppGraphBuilder.createTypeExtension({
      id: 'scores',
      relation: AppNode.companion,
      type: Drawing.Drawing,
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            variant: 'scores',
            label: ['scores.label', { ns: meta.profile.key }],
            icon: 'ph--gauge--regular',
            data: 'scores',
          }),
        ]),
    });

    const convertActions = yield* AppGraphBuilder.createTypeExtension({
      id: 'convertActions',
      type: Drawing.Drawing,
      actions: (drawing, get) => {
        const canvas = get(Obj.atom(drawing.canvas));
        if (!canvas) {
          return Effect.succeed([]);
        }
        const targets = IllustratorCapabilities.editTargets(get(variantsAtom), canvas.schema);
        return Effect.succeed(
          targets.map((variant) => {
            const slug = IllustratorCapabilities.variantSlug(variant);
            return AppGraphNode.makeAction({
              id: `convert-${slug}`,
              // The handler runs against the drawing's own space, which the action context does not supply.
              data: () =>
                Operation.invoke(
                  DrawingOperation.Convert,
                  // Always a copy beside the source, which is left as it is.
                  { drawing: Ref.make(drawing), variant: variant.id },
                  { spaceId: Obj.getDatabase(drawing)?.spaceId },
                ),
              properties: {
                label: IllustratorCapabilities.copyLabel(variant),
                icon: variant.icon ?? DrawingOperation.Convert.meta.icon,
                disposition: 'list-item',
                testId: `illustratorPlugin.convert.${slug}`,
              },
            });
          }),
        );
      },
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [companion, convertActions]);
  }),
);
