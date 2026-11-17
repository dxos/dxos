//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { type Row, SOFTWARE_DIALECT, decodeBlock } from '@dxos/deus/schema';

import { type BlockFormContext, formKey, fromFormValues, toFormValues } from './block-form.ts';
import { specBlocksConfig, specBlocksField } from './spec-blocks-state.ts';

const TEXT = [
  '```mdl',
  'type Hour: One hour of a day',
  '  fields:',
  '    start: string       # when it begins',
  '    label: string',
  '```',
  '',
].join('\n');

const setup = () => {
  const state = EditorState.create({
    doc: TEXT,
    extensions: [specBlocksConfig.of({ dialects: [SOFTWARE_DIALECT] }), specBlocksField],
  });
  const blocks = state.field(specBlocksField);
  const [block] = blocks.blocks;
  const schema = blocks.schemas.get(block.kind)!;
  const value = decodeBlock(TEXT, block, schema);
  const context: BlockFormContext = { blocks, block, defaults: { item: 'Item', entry: 'Entry' } };
  return { schema, value, context };
};

describe('block form', () => {
  test("a row's comment is its description: the form shows it, and clears and edits it", ({ expect }) => {
    const { schema, value, context } = setup();
    const values = toFormValues(schema, value, context);
    const [start, label] = values[formKey('fields')] as Row[];
    expect(start.note).toBe('when it begins');
    const next = fromFormValues(
      schema,
      value,
      {
        ...values,
        [formKey('fields')]: [
          { ...start, note: '  ' },
          { ...label, note: ' its name ' },
        ],
      },
      context,
    );
    expect((next.fields.fields as Row[]).map(({ note }) => note)).toEqual([undefined, 'its name']);
  });
});
