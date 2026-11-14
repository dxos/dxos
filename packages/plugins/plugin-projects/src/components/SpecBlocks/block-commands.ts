//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';

import { type BlockSchema, type SourceBlock, mintKey } from '@dxos/deus/schema';

import { type SlashCommand, slashCommands, slashCommandSource } from '../SpecDocumentEditor/slash-commands.ts';
import { specBlocksField } from './spec-blocks-state.ts';

/** Asks the card of the block at `at`, one a command just wrote, to focus its first field. */
export type FocusRequest = { at: number };

export const focusBlockEffect = StateEffect.define<FocusRequest | undefined>();

export const focusRequest = StateField.define<FocusRequest | undefined>({
  create: () => undefined,
  update: (value, transaction) => {
    const mapped = value && { ...value, at: transaction.changes.mapPos(value.at, 1) };
    return transaction.effects.reduce((next, effect) => (effect.is(focusBlockEffect) ? effect.value : next), mapped);
  },
});

/** The focus asked of a block's card, if any. */
export const focusRequested = (state: EditorState, block: SourceBlock): FocusRequest | undefined => {
  const request = state.field(focusRequest, false);
  return request && request.at >= block.fence.from && request.at < block.fence.to ? request : undefined;
};

/**
 * A kind's command: writes its block fenced as `mdl`, with a fresh key for a numbered kind, the text before the slash as
 * its title, and its required fields to fill in, then focuses its card.
 */
const blockCommand = (schema: BlockSchema): SlashCommand => ({
  name: schema.kind,
  icon: schema.icon,
  detail: (before) => (before ? `"${before}"` : schema.desc || undefined),
  apply: ({ view, from, to, line, before }) => {
    const { items } = view.state.field(specBlocksField);
    const id = schema.label ? mintKey(new Set(items.map(({ key }) => key))) : '';
    const start = before ? line.from : from;
    const fields = schema.fields
      .filter(({ optional, type }) => !optional && type.kind !== 'keyed')
      .map(({ name }) => `  ${name}:`);
    const head = `${schema.kind}${id ? ` ${id}` : ''}${before ? `: ${before}` : ''}`;
    view.dispatch({
      changes: { from: start, to, insert: ['```mdl', head, ...fields, '```'].join('\n') },
      effects: focusBlockEffect.of({ at: start }),
      userEvent: 'input.complete',
    });
  },
});

/** One slash command per block kind the spec's schemas define. */
export const blockCommands: Extension = [
  focusRequest,
  slashCommandSource.of((state) => {
    const blocks = state.field(specBlocksField, false);
    return blocks ? [...blocks.schemas.values()].map(blockCommand) : [];
  }),
  slashCommands,
];
