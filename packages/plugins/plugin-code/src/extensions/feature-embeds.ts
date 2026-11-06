//
// Copyright 2026 DXOS.org
//

import { type Extension, Transaction } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import * as SpecCommands from '@dxos/plugin-projects/SpecCommands';

import { FeatureEmbed } from '#types';

export type FeatureEmbedsOptions = {
  /**
   * Called when the editor opens, and after local edits settle with the objects whose embeds they took out, so the spec
   * follows its text. Edits from other peers are synced by the peer that made them.
   */
  onChange?: (event: { removed: string[] }) => void;
  /**
   * A pasted embed of an object the document already embeds is a copy: returns the URI of a new object to embed in its
   * place, or undefined to paste it as is.
   */
  onCopy?: (id: string) => string | undefined;
  /** `/feature`: makes a feature from the line's text before it, if any, and returns its embed source. */
  onCreate?: (text: string | undefined) => string | undefined;
  /** How long local edits settle before `onChange`. */
  delay?: number;
};

const ids = (text: string): Set<string> => new Set(FeatureEmbed.parse(text).map(({ id }) => id));

/**
 * A spec's embeds as its features: a paste of an embed already in the document embeds a copy of its object, `/feature`
 * makes a new feature at the cursor, and local edits that add or take out embeds are reported so the spec follows the
 * text.
 */
export const featureEmbeds = ({ onChange, onCopy, onCreate, delay = 300 }: FeatureEmbedsOptions): Extension => {
  let removed = new Set<string>();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timeout = undefined;
    const event = { removed: [...removed] };
    removed = new Set();
    onChange?.(event);
  };

  const listener = EditorView.updateListener.of((update) => {
    const local = update.transactions.some((tr) => tr.docChanged && tr.annotation(Transaction.userEvent) !== undefined);
    if (!local) {
      return;
    }
    const before = ids(update.startState.doc.toString());
    const after = ids(update.state.doc.toString());
    for (const id of before) {
      if (!after.has(id)) {
        removed.add(id);
      }
    }
    for (const id of after) {
      removed.delete(id);
    }
    clearTimeout(timeout);
    timeout = setTimeout(flush, delay);
  });

  const paste = EditorView.clipboardInputFilter.of((text, state) => {
    if (!onCopy) {
      return text;
    }
    const present = ids(state.doc.toString());
    const changes = FeatureEmbed.parse(text).flatMap(({ id, label, from, to }) => {
      const uri = present.has(id) ? onCopy(id) : undefined;
      return uri ? [{ from, to, insert: FeatureEmbed.make({ label, uri }) }] : [];
    });
    return FeatureEmbed.apply(text, changes);
  });

  const feature = onCreate
    ? SpecCommands.slashCommand.of({
        name: 'feature',
        detail: (before) => (before ? `"${before}"` : undefined),
        apply: ({ view, from, to, line, before }) => {
          const embed = onCreate(before || undefined);
          if (!embed) {
            return;
          }
          // The line's text is the feature's, so the embed takes the whole line.
          const start = before ? line.from : from;
          view.dispatch({
            changes: { from: start, to, insert: embed },
            userEvent: 'input.complete',
          });
        },
      })
    : [];

  // A spec opened after others wrote to it (an agent, a seed, a migration) is brought in line with its text.
  const open = ViewPlugin.define(() => {
    onChange?.({ removed: [] });
    return {};
  });

  return [listener, open, paste, feature, SpecCommands.slashCommands];
};
