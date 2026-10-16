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
import { SVG_SCHEMA } from '@dxos/diagram';
import { Obj, Ref } from '@dxos/echo';

import { meta } from '#meta';
import { Drawing, DrawingOperation, IllustratorCapabilities } from '#types';

/** Variant label as an id segment: variant ids carry `.` and `/`, which graph node ids reserve. */
export const variantSlug = (variant: Pick<IllustratorCapabilities.DrawingVariant, 'label'>): string =>
  variant.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
        // The SVG variant is a read-only viewer, so it is never offered as a target.
        const targets = get(variantsAtom).filter(({ id }) => id !== canvas.schema && id !== SVG_SCHEMA);
        return Effect.succeed(
          targets.map((variant) => {
            const slug = variantSlug(variant);
            return AppGraphNode.makeAction({
              id: `convert-${slug}`,
              data: () =>
                Operation.invoke(DrawingOperation.Convert, { drawing: Ref.make(drawing), variant: variant.id }),
              properties: {
                // Keyed per variant so a known renderer gets a translated label; others fall back.
                label: [`edit-in-${slug}.label`, { ns: meta.profile.key, defaultValue: `Edit in ${variant.label}` }],
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
