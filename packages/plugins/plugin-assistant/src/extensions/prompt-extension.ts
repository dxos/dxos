//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

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
    EditorView.theme({
      '& .cm-prompt-run-container': {
        position: 'relative',
        display: 'block',
        height: '0',
      },
      '& .cm-prompt-run': {
        position: 'absolute',
        right: '8px',
        top: '8px',
        zIndex: '10',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        border: 'none',
        borderRadius: '4px',
        background: 'var(--color-success, #22c55e)',
        cursor: 'pointer',
        opacity: '0.85',
        transition: 'opacity 0.15s ease',
        '&:hover': {
          opacity: '1',
        },
      },
      '& .cm-prompt-run-icon': {
        width: '0',
        height: '0',
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderLeft: '8px solid white',
        marginLeft: '2px',
      },
    }),
  ];
};

class PromptRunWidget extends WidgetType {
  constructor(
    private readonly _promptText: string,
    private readonly _onRun: (promptText: string) => void,
  ) {
    super();
  }

  override eq(other: this) {
    return this._promptText === other._promptText;
  }

  override ignoreEvent() {
    return false;
  }

  override toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-prompt-run-container';

    const button = document.createElement('button');
    button.className = 'cm-prompt-run';
    button.title = 'Run prompt in new chat';
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._onRun(this._promptText);
    });

    const icon = document.createElement('span');
    icon.className = 'cm-prompt-run-icon';
    button.appendChild(icon);
    container.appendChild(button);

    return container;
  }
}
