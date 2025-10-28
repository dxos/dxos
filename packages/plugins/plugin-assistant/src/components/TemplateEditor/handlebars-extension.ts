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
  comment: /\{\{!\s*[^}]*\}\}/g,
  brackets: /\{\{[^}]*\}\}/g,
  command: /\{\{[#/]([^}]+)\}\}/g,
  var: /\{\{(?!\s*!)(\w[^}]*)\}\}/g,
};

/**
 * ViewPlugin that decorates Handlebars syntax.
 */
const handlebarsHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    // NOTE: Decorations may clash with other extensions (e.g., markdown).
    buildDecorations(view: EditorView) {
      const widgets: any[] = [];

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);

        // Match comments: {{! comment }}
        // {
        //   let match;
        //   while ((match = regex.comment.exec(text)) !== null) {
        //     const start = from + match.index;
        //     const end = start + match[0].length;
        //     widgets.push(Decoration.mark({ class: '!text-roseText' }).range(start, end));
        //   }
        // }

        // Match brackets: {{ and }}
        {
          let match;
          while ((match = regex.brackets.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            widgets.push(Decoration.mark({ class: 'text-subdued' }).range(start, end));
          }
        }

        // Match commands: {{#command}} and {{/command}}
        {
          let match;
          while ((match = regex.command.exec(text)) !== null) {
            const start = from + match.index + 2;
            let end = start + match[0].length - 4;
            const text = view.state.doc.sliceString(start, end);
            const parts = text.split(/\s+/);
            if (parts.length > 1) {
              const idx = start + parts[0].length;
              widgets.push(Decoration.mark({ class: 'text-greenText' }).range(idx, end));
              end = idx;
            }
            widgets.push(Decoration.mark({ class: 'text-blueText' }).range(start, end));
          }
        }

        // Match variables: {{var}}
        {
          let match;
          while ((match = regex.var.exec(text)) !== null) {
            const start = from + match.index + 2;
            const end = start + match[0].length - 4;
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
        this.decorations = this.buildDecorations(update.view);
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
