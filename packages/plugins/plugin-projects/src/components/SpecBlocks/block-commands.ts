//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';

import { type BlockSchema, mintKey } from '@dxos/deus/schema';

import { type SlashCommand, slashCommands, slashCommandSource } from '../SpecDocumentEditor/slash-commands.ts';
import { type BlockLocator, specBlocksField } from './spec-blocks-state.ts';

/** Asks a block's card to focus `target`, a selector in the card, or else its first field: a block just written or renamed. */
export type FocusRequest = BlockLocator & { target?: string };

export const focusBlockEffect = StateEffect.define<FocusRequest | undefined>();

export const focusRequest = StateField.define<FocusRequest | undefined>({
  create: () => undefined,
  update: (value, transaction) =>
    transaction.effects.reduce((next, effect) => (effect.is(focusBlockEffect) ? effect.value : next), value),
});

/** The focus asked of a card, if any. */
export const focusRequested = (state: EditorState, { kind, id, index }: BlockLocator): FocusRequest | undefined => {
  const request = state.field(focusRequest, false);
  return request && request.kind === kind && request.id === id && request.index === index ? request : undefined;
};

/**
 * A kind's command: writes its block fenced as `mdl`, with a fresh key for a numbered kind, the text before the slash as
 * its title, and its required fields to fill in, then focuses its card.
 */
const blockCommand = (schema: BlockSchema): SlashCommand => ({
  name: schema.kind,
  detail: (before) => (before ? `"${before}"` : schema.desc || undefined),
  apply: ({ view, from, to, line, before }) => {
    const { blocks, items } = view.state.field(specBlocksField);
    const id = schema.label ? mintKey(new Set(items.map(({ key }) => key))) : '';
    const start = before ? line.from : from;
    const fields = schema.fields
      .filter(({ optional, type }) => !optional && type.kind !== 'keyed')
      .map(({ name }) => `  ${name}:`);
    const head = `${schema.kind}${id ? ` ${id}` : ''}${before ? `: ${before}` : ''}`;
    const index = blocks.filter((block) => block.kind === schema.kind && block.id === id && block.from < start).length;
    view.dispatch({
      changes: { from: start, to, insert: ['```mdl', head, ...fields, '```'].join('\n') },
      effects: focusBlockEffect.of({ kind: schema.kind, id, index }),
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
