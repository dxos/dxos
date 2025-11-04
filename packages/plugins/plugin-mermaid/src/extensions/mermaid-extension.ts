//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import _mermaid from 'mermaid';

export type MermaidOptions = {};

/**
 * Extension to create mermaid diagrams.
 */
export const mermaid = (_options: MermaidOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        // Always rebuild decorations when selection changes to handle arrow key navigation.
        if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

        syntaxTree(view.state).iterate({
          enter: (node) => {
            if (node.name === 'FencedCode') {
              const cursor = view.state.selection.main.head;
              // Show widget when cursor is outside the code block.
              // Add a buffer of 1 position before and after to handle edge cases.
              const showWidget = view.state.readOnly || cursor < node.from - 1 || cursor > node.to + 1;
              if (showWidget) {
                const info = node.node.getChild('CodeInfo');
                if (info) {
                  const type = view.state.sliceDoc(info.from, info.to);
                  const text = node.node.getChild('CodeText');
                  if (type === 'mermaid' && text) {
                    const content = view.state.sliceDoc(text.from, text.to).trim();
                    const label = content.split(' ')[0];

                    // Create widget.
                    const widget = new MermaidWidget(`mermaid-${node.from}`, content, label);

                    // Find the line after the code block to place the widget.
                    const endLine = view.state.doc.lineAt(node.to);
                    const nextLinePos = endLine.to + 1;

                    // Add widget after the code block.
                    if (nextLinePos <= view.state.doc.length) {
                      decorations.push({
                        from: nextLinePos,
                        to: nextLinePos,
                        decoration: Decoration.widget({
                          widget,
                        }),
                      });
                    } else {
                      // Check if at the end of the document.
                      decorations.push({
                        from: endLine.to,
                        to: endLine.to,
                        decoration: Decoration.widget({
                          widget,
                          side: 1,
                        }),
                      });
                    }

                    // Hide each line of the code block.
                    const startLine = view.state.doc.lineAt(node.from);
                    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
                      const line = view.state.doc.line(lineNum);
                      decorations.push({
                        from: line.from,
                        to: line.from,
                        decoration: Decoration.line({
                          class: 'cm-mermaid-hidden',
                        }),
                      });
                    }
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
    '& .cm-mermaid': {
      position: 'relative',
      display: 'inline-flex',
      width: '100%',
      maring: '4px 0',
      padding: '16px',
      justifyContent: 'center',
      backgroundColor: 'var(--dx-groupSurface)',
      borderRadius: '8px',
    },
    '& .cm-mermaid-label': {
      position: 'absolute',
      right: '16px',
      fontFamily: 'unset',
      color: 'var(--dx-subdued)',
    },
    '& .cm-mermaid-error': {
      display: 'inline-block',
      color: 'var(--dx-errorText)',
    },
    '& .cm-mermaid-hidden': {
      display: 'none !important',
    },
  }),
];

class MermaidWidget extends WidgetType {
  _svg: string | undefined;
  _error: string | undefined;

  // TODO(burdon): Mermaid API requires unique id.
  constructor(
    private readonly _id: string,
    private readonly _source: string,
    private readonly _label?: string,
  ) {
    super();
  }

  override eq(other: this): boolean {
    return this._source === other._source;
  }

  override toDOM(view: EditorView): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'cm-mermaid';

    setTimeout(async () => {
      // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/config.type.ts
      _mermaid.initialize({
        darkMode: view.state.facet(EditorView.darkTheme),
        theme: 'neutral',
        // TODO(burdon): Styles.
        // NOTE: Must specify 'base' in order to override.
        // theme: 'base',
        // themeVariables: {
        //   primaryColor: getToken('extend.colors.red.100'),
        //   primaryBorderColor: getToken('extend.colors.neutral.200'),
        // },
        // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/flowchart/styles.ts
        // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/sequence/styles.js
        // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/state/styles.js
        // themeCSS: '.node rect { fill: red; }',
      });

      // TODO(burdon): Cache?
      const svg = await this.render(div);
      if (this._error) {
        div.className = 'cm-mermaid-error';
        div.innerText = this._error;
      } else {
        div.className = 'cm-mermaid';
        div.innerHTML = svg!;

        if (this._label) {
          const label = document.createElement('span');
          label.innerText = this._label;
          label.className = 'cm-mermaid-label';
          div.appendChild(label);
          view.requestMeasure();
        }
      }
    });

    return div;
  }

  async render(_container: Element): Promise<string | undefined> {
    try {
      // https://github.com/mermaid-js/mermaid
      const valid = await _mermaid.parse(this._source);
      if (valid) {
        const result = await _mermaid.render(this._id, this._source);
        this._error = undefined;
        this._svg = result.svg;
        return result.svg;
      }
    } catch (err: any) {
      this._error = String(err);
      this._svg = undefined;
    }
  }

  override ignoreEvent(e: Event): boolean {
    return !/^mouse/.test(e.type);
  }
}
