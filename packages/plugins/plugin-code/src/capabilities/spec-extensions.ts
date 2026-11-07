//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { SpecSourcesProvider } from '#containers';
import { FeatureMap } from '#types';

import { featureEmbedExtensions } from '../extensions/feature-embed-extensions.ts';
import { softwareCommands } from '../extensions/software-commands.ts';
import { CodeNamespace } from '../namespace.ts';
import { FEATURE_VIEWS, SOFTWARE_FACTS, SPEC_VIEWS } from '../spec-views.ts';

const SOFTWARE_DIALECTS = [FeatureMap.SOFTWARE_DIALECT];

/**
 * The software dialect and what it brings a spec: its data model, API and the code a review cites; its features on a
 * board, kept in step with their embeds in any editor of it; `/feature` and a slash command for each of its other
 * blocks. The views every spec has read the checkout through this plugin.
 */
export default Capability.makeModule(() =>
  Effect.succeed([
    ...SPEC_VIEWS.map(({ id, group, icon }) =>
      Capability.contribute(ProjectCapabilities.SpecView, {
        id,
        group,
        icon,
        label: [`spec-view.${id}.label`, { ns: CodeNamespace.key }],
        dialects: SOFTWARE_DIALECTS,
      }),
    ),
    ...FEATURE_VIEWS.map(({ id, icon }) =>
      Capability.contribute(ProjectCapabilities.SpecView, {
        id,
        group: 'structure',
        icon,
        label: [`feature-map.mode.${id}.label`, { ns: CodeNamespace.key }],
        dialects: SOFTWARE_DIALECTS,
      }),
    ),
    Capability.contribute(ProjectCapabilities.SpecPackage, {
      id: 'software',
      label: ['software-package.label', { ns: CodeNamespace.key }],
      dialects: SOFTWARE_DIALECTS,
      facts: SOFTWARE_FACTS,
    }),
    Capability.contribute(ProjectCapabilities.SpecExtensions, (spec, { dialects, t }) =>
      dialects.includes(FeatureMap.SOFTWARE_DIALECT)
        ? [
            ...featureEmbedExtensions(spec, {
              newName: t('feature-map.new-feature.name', { ns: CodeNamespace.key }),
            }),
            ...softwareCommands,
          ]
        : [],
    ),
    Capability.contribute(ProjectCapabilities.SpecSourcesProvider, SpecSourcesProvider),
  ]),
);
