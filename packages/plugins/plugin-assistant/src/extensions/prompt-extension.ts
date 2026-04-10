//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

export type PromptExtensionOptions = {
  /** Called when the user clicks the run button on a prompt code block. */
  onRun: (promptText: string) => void;
};

/**
 * CodeMirror extension that adds a green "run" button to ```prompt fenced code blocks.
 */
export const promptRunExtension = ({ onRun }: PromptExtensionOptions): Extension => {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged) {
            this.decorations = this.buildDecorations(update.view);
          }
        }

        buildDecorations(view: EditorView): DecorationSet {
          const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

          syntaxTree(view.state).iterate({
            enter: (node) => {
              if (node.name === 'FencedCode') {
                const info = node.node.getChild('CodeInfo');
                if (info) {
                  const type = view.state.sliceDoc(info.from, info.to);
                  const text = node.node.getChild('CodeText');
                  if (type === 'prompt' && text) {
                    const content = view.state.sliceDoc(text.from, text.to).trim();
                    if (content.length > 0) {
                      const widget = new PromptRunWidget(content, onRun);
                      decorations.push({
                        from: node.from,
                        to: node.from,
                        decoration: Decoration.widget({ widget, side: -1 }),
                      });
                    }
                  }
                }
              }
            },
          });

          return Decoration.set(
            decorations.sort((a, b) => a.from - b.from || a.to - b.to).map((d) => d.decoration.range(d.from, d.to)),
          );
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    ),
  ];
};

class PromptRunWidget extends WidgetType {
  constructor(
    private readonly prompt: string,
    private readonly onClick: (promptText: string) => void,
  ) {
    super();
  }

  override eq(other: this) {
    return this.prompt === other.prompt;
  }

  override ignoreEvent() {
    return false;
  }

  override toDOM() {
    return Domino.of('div')
      .classNames('relative')
      .append(
        Domino.of('button')
          .classNames('dx-button absolute right-0 top-4')
          .on('mousedown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.onClick(this.prompt);
          })
          .append(
            Domino.of('svg', Domino.SVG)
              .classNames('w-4 h-4 cursor-pointer')
              .append(
                Domino.of('use', Domino.SVG).attributes({
                  href: Domino.icon('ph--play--regular'),
                }),
              ),
          ),
      ).root;
  }
}
