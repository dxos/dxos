//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { FeatureMap } from '#types';

import { featureEmbedExtensions } from '../extensions/feature-embed-extensions.ts';
import { softwareCommands } from '../extensions/software-commands.ts';
import { videoCommands } from '../extensions/video-commands.ts';
import { CodeNamespace } from '../namespace.ts';
import { FEATURE_VIEWS, SPEC_VIEWS } from '../spec-views.ts';

/** The video dialect, whose scenes, shots and cast Definitions draws like any other dialect's blocks. */
const VIDEO_DIALECT = 'org.dxos.spec.video';

/**
 * The views this plugin draws in a spec's companion tabs, and the software and video packages. A spec using the
 * software package keeps its features in step with their embeds in any editor of it, such as plugin-code's, offers
 * `/feature` and a slash command for each of its other blocks, and shows its features on a canvas and a board; one
 * using the video package offers a slash command for each of its blocks.
 */
export default Capability.makeModule(() =>
  Effect.succeed([
    ...SPEC_VIEWS.map(({ id, group, icon, dialects }) =>
      Capability.contribute(ProjectCapabilities.SpecView, {
        id,
        group,
        icon,
        label: [`spec-view.${id}.label`, { ns: CodeNamespace.key }],
        dialects,
      }),
    ),
    ...FEATURE_VIEWS.map(({ id, icon }) =>
      Capability.contribute(ProjectCapabilities.SpecView, {
        id,
        group: 'structure',
        icon,
        label: [`feature-map.mode.${id}.label`, { ns: CodeNamespace.key }],
        dialects: [FeatureMap.DIALECT],
      }),
    ),
    Capability.contribute(ProjectCapabilities.SpecPackage, {
      id: 'software',
      label: ['software-package.label', { ns: CodeNamespace.key }],
      dialects: FeatureMap.SOFTWARE_DIALECTS,
    }),
    Capability.contribute(ProjectCapabilities.SpecPackage, {
      id: 'video',
      label: ['video-package.label', { ns: CodeNamespace.key }],
      dialects: [VIDEO_DIALECT],
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
    Capability.contribute(ProjectCapabilities.SpecExtensions, (_spec, { dialects }) =>
      dialects.includes(VIDEO_DIALECT) ? videoCommands : [],
    ),
  ]),
);
