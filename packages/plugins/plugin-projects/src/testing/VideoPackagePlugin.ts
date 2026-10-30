//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { ProjectCapabilities } from '#types';

import { blockTemplate } from '../components/SpecDocumentEditor/index.ts';

/** The sample video dialect: a script's scenes, shots, voiceover and captions. */
export const DIALECT = 'org.dxos.spec.video';

const commands = [
  blockTemplate({ name: 'scene', kind: 'scene', prefix: 'SC', fields: ['duration: ', 'goal: '] }),
  blockTemplate({ name: 'shot', kind: 'shot', prefix: 'SH', fields: ['scene: ', 'camera: ', 'action: '] }),
  blockTemplate({ name: 'voiceover', kind: 'voiceover', prefix: 'VO', fields: ['scene: ', 'at: '] }),
  blockTemplate({ name: 'caption', kind: 'caption', prefix: 'CA', fields: ['scene: ', 'at: '] }),
];

const Video = Capability.inlineModule(
  'VideoPackage',
  { provides: [ProjectCapabilities.SpecPackage, ProjectCapabilities.SpecExtensions] },
  () =>
    Effect.succeed([
      Capability.contribute(ProjectCapabilities.SpecPackage, { id: 'video', label: 'Video', dialects: [DIALECT] }),
      Capability.contribute(ProjectCapabilities.SpecExtensions, (_spec, { dialects }) =>
        dialects.includes(DIALECT) ? commands.flat() : [],
      ),
    ]),
);

/**
 * A sample extension package from a plugin other than plugin-projects: a video dialect with no views of its own, only a
 * slash command per block.
 */
export const make = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.projects.testing.videoPackage'),
    name: 'Video package',
  }),
).pipe(Plugin.addModule(Video), Plugin.make);
