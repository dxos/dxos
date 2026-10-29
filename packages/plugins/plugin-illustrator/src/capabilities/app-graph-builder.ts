//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';

import { Drawing, DrawingOperation, IllustratorCapabilities } from '#types';

import { IllustratorNamespace } from '../namespace.ts';

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
            label: ['scores.label', { ns: IllustratorNamespace.key }],
            icon: 'ph--gauge--regular',
            data: 'scores',
          }),
        ]),
    });

    const convertActions = yield* AppGraphBuilder.createTypeExtension({
      id: 'convertActions',
      type: Drawing.Drawing,
      actions: (drawing, get) => {
        // Read through the atom so the actions follow the canvas; the variant is matched on the live object.
        const variants = get(variantsAtom);
        const from = get(Obj.atom(drawing.canvas))
          ? IllustratorCapabilities.variantFor(drawing.canvas.target, variants)
          : undefined;
        if (!from) {
          return Effect.succeed([]);
        }
        const targets = IllustratorCapabilities.editTargets(variants, from.id);
        return Effect.succeed(
          targets.map((variant) => {
            const slug = IllustratorCapabilities.variantSlug(variant);
            return AppGraphNode.makeAction({
              id: `convert-${slug}`,
              // The handler runs against the drawing's own space, which the action context does not supply.
              data: () =>
                Effect.gen(function* () {
                  // Always a copy beside the source, which is left as it is; the copy is opened, as it is new.
                  const result = yield* Operation.invoke(
                    DrawingOperation.Convert,
                    { drawing: Ref.make(drawing), variant: variant.id },
                    { spaceId: Obj.getDatabase(drawing)?.spaceId },
                  );
                  const copy = yield* Effect.promise(() => result.drawing.load());
                  yield* Operation.invoke(LayoutOperation.Open, {
                    subject: [GraphPath.getObjectPathFromObject(copy)],
                  });
                }),
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
