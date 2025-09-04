//
// Copyright 2025 DXOS.org
//

import {
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';

export type HandlebarsOptions = {};

/**
 * Simple Handlebars plugin for CodeMirror.
 * Supports:
 * - Comments: {{! comment }}
 * - Commands: {{#command}} {{/command}}
 * - Variables: {{var}}
 * - Commands with variables: {{#each items}} {{/each}}
 */
export const handlebars = (_: HandlebarsOptions = {}): Extension => {
  return [
    handlebarsHighlightPlugin,
    autocompletion({
      activateOnTyping: true,
      aboveCursor: true,
      closeOnBlur: true,
      override: [handlebarsCompletions],
    }),
    keymap.of(completionKeymap),
  ];
};

const regex = {
  commentRegex: /\{\{!\s*[^}]*\}\}/g,
  commandRegex: /\{\{[#/]([^}]+)\}\}/g,
  varRegex: /\{\{(?!\s*!)([^}]+)\}\}/g,
};

/**
 * ViewPlugin that decorates Handlebars syntax.
 */
const handlebarsHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDeco(view);
    }

    buildDeco(view: EditorView) {
      const widgets: any[] = [];

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);

        // Match comments: {{! comment }}
        {
          let match;
          while ((match = regex.commentRegex.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            widgets.push(Decoration.mark({ class: 'text-subdued' }).range(start, end));
          }
        }

        // Match commands: {{#command}} and {{/command}}
        {
          let match;
          while ((match = regex.commandRegex.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            widgets.push(Decoration.mark({ class: 'text-blueText' }).range(start, end));
          }
        }

        // Match variables: {{var}}
        {
          let match;
          while ((match = regex.varRegex.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            widgets.push(Decoration.mark({ class: 'text-greenText' }).range(start, end));
          }
        }
      }

      // Sort decorations by position to avoid "Ranges must be added sorted" error.
      widgets.sort((a, b) => a.from - b.from || a.startSide - b.startSide);
      return Decoration.set(widgets);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDeco(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// TODO(burdon): Pass in variables.
const variables = ['this'];
const commands = ['this', 'each', 'if', 'unless', 'with'];

/**
 * Provides completions for Handlebars variables.
 */
function handlebarsCompletions(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/\{\{[^}]*/);
  if (!match || match.from === match.to) {
    return null;
  }

  let type = 'variable';
  let text = match.text.slice(2);
  let from = match.from + 2;
  let matches = [];
  if (text.startsWith('#') || text.startsWith('/')) {
    const idx = text.lastIndexOf(' ');
    if (idx !== -1) {
      type = 'variable';
      matches = variables;
      text = text.slice(idx + 1);
      from += idx + 1;
    } else {
      type = 'command';
      text = text.slice(1);
      matches = commands;
      from += 1;
    }
  } else {
    type = 'variable';
    matches = variables;
  }

  const options = matches.filter((name) => name.startsWith(text)).map((name) => ({ type, label: name }));
  return {
    from,
    options,
  };
}
