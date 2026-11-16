//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import * as SpecCommands from '@dxos/plugin-projects/SpecCommands';

/** The video package's blocks, each written in place by its slash command for the script to fill in. */
export const videoCommands: Extension[] = [
  SpecCommands.blockTemplate({ name: 'scene', kind: 'scene', prefix: 'SC', fields: ['duration: ', 'goal: '] }),
  SpecCommands.blockTemplate({ name: 'shot', kind: 'shot', prefix: 'SH', fields: ['scene: ', 'camera: ', 'action: '] }),
  SpecCommands.blockTemplate({ name: 'voiceover', kind: 'voiceover', prefix: 'VO', fields: ['scene: ', 'at: '] }),
  SpecCommands.blockTemplate({ name: 'caption', kind: 'caption', prefix: 'CA', fields: ['scene: ', 'at: '] }),
];
