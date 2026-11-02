//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import * as SpecCommands from '@dxos/plugin-projects/SpecCommands';

/** The software package's blocks beyond features, each written in place by its slash command for the spec to fill in. */
export const softwareCommands: Extension[] = [
  SpecCommands.blockTemplate({ name: 'type', kind: 'type', fields: ['desc: ', 'fields:'] }),
  SpecCommands.blockTemplate({ name: 'op', kind: 'op', fields: ['key: ', 'desc: ', 'input:', 'output: '] }),
  SpecCommands.blockTemplate({
    name: 'scenario',
    kind: 'scenario',
    prefix: 'T',
    fields: ['given: ', 'when: ', 'then: '],
  }),
  SpecCommands.blockTemplate({
    name: 'test',
    kind: 'test',
    prefix: 'QA',
    fields: ['desc: ', 'steps:', '  - name: ', '    do: ', '    expect: '],
  }),
  SpecCommands.blockTemplate({ name: 'table', kind: 'table', fields: ['store: ', 'columns:', 'key: '] }),
];
