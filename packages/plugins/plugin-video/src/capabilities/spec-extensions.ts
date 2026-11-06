//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { videoCommands } from '../extensions/video-commands.ts';
import { VideoNamespace } from '../namespace.ts';

/** The video dialect, whose scenes, shots and cast Definitions draws like any other dialect's blocks. */
const VIDEO_DIALECT = 'org.dxos.spec.video';

/** The video package: a spec using it offers a slash command for each of its blocks. */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(ProjectCapabilities.SpecPackage, {
      id: 'video',
      label: ['video-package.label', { ns: VideoNamespace.key }],
      dialects: [VIDEO_DIALECT],
    }),
    Capability.contribute(ProjectCapabilities.SpecExtensions, (_spec, { dialects }) =>
      dialects.includes(VIDEO_DIALECT) ? videoCommands : [],
    ),
  ]),
);
