//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { type Extension, Facet, type Line } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

/** Where a slash command runs: the `/name` typed (`from`–`to`) and the text before it on its line. */
export type SlashCommandTarget = { view: EditorView; from: number; to: number; line: Line; before: string };

/** A command a spec's text offers after a slash that starts a word. */
export type SlashCommand = {
  /** What follows the slash. */
  name: string;
  detail?: (before: string) => string | undefined;
  apply: (target: SlashCommandTarget) => void;
};

/** The commands each extension package contributes; `slashCommands` lists them all. */
export const slashCommand = Facet.define<SlashCommand>();

const source = (context: CompletionContext): CompletionResult | null => {
  const commands = context.state.facet(slashCommand);
  const word = context.matchBefore(/\/[\w-]*$/);
  if (commands.length === 0 || !word || (word.from === word.to && !context.explicit)) {
    return null;
  }
  const line = context.state.doc.lineAt(context.pos);
  // Only a slash that starts a word, so a path such as `packages/` offers nothing.
  if (word.from > line.from && !/\s/.test(context.state.sliceDoc(word.from - 1, word.from))) {
    return null;
  }
  const before = context.state.sliceDoc(line.from, word.from).trim();
  return {
    from: word.from,
    filter: true,
    options: commands.map(({ name, detail, apply }) => ({
      label: `/${name}`,
      detail: detail?.(before),
      type: 'keyword',
      apply: (view, _completion, from, to) => apply({ view, from, to, line, before }),
    })),
  };
};

/** One completion for every contributed command, a single instance so packages contributing commands share it. */
export const slashCommands: Extension = autocompletion({ override: [source] });

export type BlockTemplateProps = {
  name: string;
  /** The block's keyword, as its dialect declares it. */
  kind: string;
  /** Numbers the block after the ones of its kind already in the text (`SC-1`, `SC-2`, …); unnumbered without it. */
  prefix?: string;
  /** The block's field lines, indented under its head. */
  fields: readonly string[];
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A command that writes a dialect block's structure in place, fenced as `mdl`. Text before the slash becomes the
 * block's title; otherwise the cursor waits where the title goes.
 */
export const blockTemplate = ({ name, kind, prefix, fields }: BlockTemplateProps): Extension[] => [
  slashCommand.of({
    name,
    detail: (before) => (before ? `"${before}"` : undefined),
    apply: ({ view, from, to, line, before }) => {
      let id = '';
      if (prefix) {
        const pattern = new RegExp(`^${escape(kind)} ${escape(prefix)}-(\\d+)`, 'gm');
        const numbers = [...view.state.doc.toString().matchAll(pattern)].map(([, n]) => Number(n));
        id = ` ${prefix}-${Math.max(0, ...numbers) + 1}`;
      }
      const head = `${kind}${id}${prefix ? ':' : ''} `;
      const body = fields.map((field) => `  ${field}`).join('\n');
      const start = before ? line.from : from;
      const opening = '```mdl\n';
      const insert = `${opening}${head}${before}\n${body}\n\`\`\``;
      const cursor = before
        ? start + opening.length + head.length + before.length + 1 + (fields[0] ? fields[0].length + 2 : 0)
        : start + opening.length + head.length;
      view.dispatch({
        changes: { from: start, to, insert },
        selection: { anchor: cursor },
        userEvent: 'input.complete',
      });
    },
  }),
  slashCommands,
];
