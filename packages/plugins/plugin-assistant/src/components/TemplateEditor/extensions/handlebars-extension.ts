//
// Copyright 2025 DXOS.org
//

import {
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from '@codemirror/view';

import { $, mx } from '@dxos/ui';

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
  // {{! comment }}
  comment: /\{\{!\s*[^}]*\}\}/g,

  // {{var}}
  brackets: /\{\{[^}]*\}\}/g,

  // {{#command}} {{/command}}
  command: /\{\{[#/]([^}]+)\}\}/g,

  // {{var}}
  var: /\{\{(?!\s*!)(\w[^}]*)\}\}/g,

  // @dxn:queue:data:xxx
  dxn: /@?dxn:[\w@:]+/g,

  // dxos.org/type/xxx
  url: /[\w.-]+\.[\w.-]+\/[\w/]+/g,
};

const tagPadding = 'mli-0.5 pli-1 rounded-sm';

/**
 * ViewPlugin that decorates Handlebars syntax.
 */
const handlebarsHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    // NOTE: Decorations may clash with other extensions (e.g., markdown).
    buildDecorations(view: EditorView) {
      const selection = view.state.selection.main;
      const decorations: Array<{
        from: number;
        to: number;
        decoration: Decoration;
      }> = [];

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);

        // Match DXN.
        {
          let match;
          while ((match = regex.dxn.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            // Only show widget if selection doesn't overlap with the match range.
            const overlaps = selection.to > start && selection.from <= end;
            if (!overlaps) {
              decorations.push({
                from: start,
                to: end,
                decoration: Decoration.widget({
                  widget: new DXNWidget(match[0]),
                }),
              });
            }
          }
        }

        // Match URLs.
        {
          let match;
          while ((match = regex.url.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            decorations.push({
              from: start,
              to: end,
              decoration: Decoration.mark({
                class: mx('dx-tag--blue', tagPadding),
              }),
            });
          }
        }

        // Match brackets: {{ and }}.
        {
          let match;
          while ((match = regex.brackets.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            decorations.push({
              from: start,
              to: end,
              decoration: Decoration.mark({ class: 'text-subdued' }),
            });
          }
        }

        // Match commands: {{#command}} and {{/command}}.
        {
          let match;
          while ((match = regex.command.exec(text)) !== null) {
            const start = from + match.index + 2;
            let end = start + match[0].length - 4;
            const text = view.state.doc.sliceString(start, end);
            const parts = text.split(/\s+/);
            if (parts.length > 1) {
              const idx = start + parts[0].length;
              decorations.push({
                from: idx,
                to: end,
                decoration: Decoration.mark({ class: 'text-greenText' }),
              });
              end = idx;
            }
            decorations.push({
              from: start,
              to: end,
              decoration: Decoration.mark({ class: 'text-blueText' }),
            });
          }
        }

        // Match variables: {{var}}.
        {
          let match;
          while ((match = regex.var.exec(text)) !== null) {
            const start = from + match.index + 2;
            const end = start + match[0].length - 4;
            decorations.push({
              from: start,
              to: end,
              decoration: Decoration.mark({ class: 'text-greenText' }),
            });
          }
        }
      }

      // Sort decorations by position to satisfy RangeSetBuilder requirements.
      decorations.sort((a, b) => a.from - b.from || a.to - b.to);

      // Add sorted decorations to builder.
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to, decoration } of decorations) {
        builder.add(from, to, decoration);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

class DXNWidget extends WidgetType {
  constructor(private readonly _identifier: string) {
    super();
  }

  override ignoreEvent() {
    return false;
  }

  override eq(other: this) {
    return this._identifier === other._identifier;
  }

  override toDOM() {
    const text = this._identifier
      .split(':')
      .map((part) => {
        const len = 16;
        const plen = 4;
        if (part.length > len) {
          return `[${part.slice(0, plen)}…${part.slice(-plen)}]`;
        }
        return part;
      })
      .join(':');
    return $('<span>').addClass(mx('font-mono dx-tag--blue', tagPadding)).text(text).get(0)!;
  }
}

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
