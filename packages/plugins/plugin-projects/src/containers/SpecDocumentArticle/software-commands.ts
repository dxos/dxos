//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { blockTemplate } from '../../components/SpecDocumentEditor/index.ts';

/** The software package's blocks beyond features, each written in place by its slash command for the spec to fill in. */
export const softwareCommands: Extension[] = [
  blockTemplate({ name: 'type', kind: 'type', fields: ['desc: ', 'fields:'] }),
  blockTemplate({ name: 'op', kind: 'op', fields: ['key: ', 'desc: ', 'input:', 'output: '] }),
  blockTemplate({ name: 'scenario', kind: 'scenario', prefix: 'T', fields: ['given: ', 'when: ', 'then: '] }),
  blockTemplate({
    name: 'test',
    kind: 'test',
    prefix: 'QA',
    fields: ['desc: ', 'steps:', '  - name: ', '    do: ', '    expect: '],
  }),
  blockTemplate({ name: 'table', kind: 'table', fields: ['store: ', 'columns:', 'key: '] }),
];
