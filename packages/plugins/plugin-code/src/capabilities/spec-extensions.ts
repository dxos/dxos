//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { FeatureMap } from '#types';

import { featureEmbedExtensions } from '../extensions/feature-embed-extensions.ts';
import { softwareCommands } from '../extensions/software-commands.ts';
import { CodeNamespace } from '../namespace.ts';

/**
 * The software package: a spec using it keeps its features in step with their embeds in any editor of it, such as
 * plugin-code's, offers `/feature` and a slash command for each of its other blocks, and shows its features on a canvas
 * and a board.
 */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(ProjectCapabilities.SpecView, {
      id: 'canvas',
      label: ['feature-map.mode.canvas.label', { ns: CodeNamespace.key }],
      icon: 'ph--graph--regular',
      dialects: [FeatureMap.DIALECT],
    }),
    Capability.contribute(ProjectCapabilities.SpecView, {
      id: 'kanban',
      label: ['feature-map.mode.kanban.label', { ns: CodeNamespace.key }],
      icon: 'ph--kanban--regular',
      dialects: [FeatureMap.DIALECT],
    }),
    Capability.contribute(ProjectCapabilities.SpecPackage, {
      id: 'software',
      label: ['software-package.label', { ns: CodeNamespace.key }],
      dialects: FeatureMap.SOFTWARE_DIALECTS,
    }),
    Capability.contribute(ProjectCapabilities.SpecExtensions, (spec, { dialects, t }) =>
      dialects.includes(FeatureMap.DIALECT)
        ? [
            ...featureEmbedExtensions(spec, {
              newName: t('feature-map.new-feature.name', { ns: CodeNamespace.key }),
            }),
            ...softwareCommands,
          ]
        : [],
    ),
  ]),
);
