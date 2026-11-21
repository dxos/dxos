//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { SOFTWARE_DIALECT } from '@dxos/deus/schema';

import { specBlocksConfig, specBlocksField } from './spec-blocks-state.ts';

const TEXT = [
  '```mdl',
  'type Message: One email',
  '```',
  '',
  '```mdl',
  'type Folder: A place for mail',
  '```',
  '',
].join('\n');

const handles = (state: EditorState) => {
  const { blocks, handles } = state.field(specBlocksField);
  return Object.fromEntries(blocks.map((block, index) => [block.id, handles[index]]));
};

describe('block handles', () => {
  const start = EditorState.create({
    doc: TEXT,
    extensions: [specBlocksConfig.of({ dialects: [SOFTWARE_DIALECT] }), specBlocksField],
  });
  const { Message, Folder } = handles(start);

  test('a block keeps its handle when it is renamed or text is written above it', ({ expect }) => {
    const from = TEXT.indexOf('Message');
    const renamed = start.update({ changes: { from, to: from + 'Message'.length, insert: 'Email' } }).state;
    expect(handles(renamed)).toEqual({ Email: Message, Folder });
    const above = renamed.update({ changes: { from: 0, insert: 'Intro.\n\n' } }).state;
    expect(handles(above)).toEqual({ Email: Message, Folder });
  });

  test('a deleted block takes its handle with it', ({ expect }) => {
    const gone = start.update({ changes: { from: 0, to: TEXT.indexOf('```mdl', 1) } }).state;
    expect(handles(gone)).toEqual({ Folder });
    const restored = gone.update({ changes: { from: 0, insert: TEXT.slice(0, TEXT.indexOf('```mdl', 1)) } }).state;
    expect(Object.values(handles(restored))).not.toContain(Message);
  });
});
