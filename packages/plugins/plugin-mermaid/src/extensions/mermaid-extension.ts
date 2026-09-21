//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import Mermaid, { type MermaidConfig } from 'mermaid';

export type MermaidOptions = Pick<MermaidConfig, 'theme' | 'themeVariables' | 'themeCSS'>;

/**
 * Ties the diagram to the design system on top of whichever theme is active. The SVG is inlined
 * into the editor, so `var(--color-…)` resolves against the page in both colour modes; mermaid's
 * own `themeVariables` cannot do this, since it derives a palette from them with colour math that
 * needs concrete colours.
 */
const DEFAULT_THEME_CSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path { fill: var(--color-card-surface); stroke: var(--color-separator); }
  .label text, .node text, .nodeLabel, .edgeLabel, .label span { color: var(--color-base-fg); fill: var(--color-base-fg); }
  .edgePath .path, .flowchart-link { stroke: var(--color-subdued); }
  .edgeLabel { background-color: var(--color-group-surface); }
  .marker { fill: var(--color-subdued); stroke: var(--color-subdued); }
`;

/** The full mermaid config for the editor's colour mode; `options` win over the defaults. */
const createConfig = (options: MermaidOptions, dark: boolean): MermaidConfig => ({
  darkMode: dark,
  theme: dark ? 'dark' : 'neutral',
  themeCSS: DEFAULT_THEME_CSS,
  // Native SVG text labels: the strict-mode sanitizer strips foreignObject HTML label
  // content (mermaid 10.9.4 with dompurify 3.x), leaving unlabeled nodes.
  flowchart: { htmlLabels: false },
  ...options,
});

/**
 * Extension to create mermaid diagrams.
 *
 * The fenced source is highlighted while the cursor is inside the block (where this extension
 * suppresses the widget). That highlighting comes from `mermaidLanguageDescription`, registered in
 * `@dxos/ui-editor`'s markdown bundle rather than here: `codeLanguages` is read once when the
 * markdown parser is built, so an extension contributed afterwards cannot add a fenced-code language.
 */
export const mermaid = (options: MermaidOptions = {}): Extension => {
  // One config per colour mode, built once: the widget's identity includes its config, so a fresh
  // object per rebuild would replace (and re-render) every diagram on each selection change.
  const configs = { light: createConfig(options, false), dark: createConfig(options, true) };
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
          // Always rebuild decorations when selection changes to handle arrow key navigation.
          // A colour-mode switch arrives as a reconfiguration, so compare the facet as well.
          const themeChanged =
            update.state.facet(EditorView.darkTheme) !== update.startState.facet(EditorView.darkTheme);
          if (
            update.docChanged ||
            update.viewportChanged ||
            update.selectionSet ||
            update.focusChanged ||
            themeChanged
          ) {
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
                      const widget = new MermaidWidget(
                        `mermaid-${node.from}`,
                        content,
                        view.state.facet(EditorView.darkTheme) ? configs.dark : configs.light,
                        label,
                      );

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
        margin: '4px 0',
        padding: '16px',
        justifyContent: 'center',
        backgroundColor: 'var(--color-group-surface)',
        borderRadius: '8px',
      },
      '& .cm-mermaid-label': {
        position: 'absolute',
        right: '16px',
        fontFamily: 'unset',
        color: 'var(--color-subdued)',
      },
      '& .cm-mermaid-error': {
        display: 'inline-block',
        color: 'var(--color-error)',
      },
      '& .cm-mermaid-hidden': {
        display: 'none !important',
      },
    }),
  ];
};

class MermaidWidget extends WidgetType {
  _svg: string | undefined;
  _error: string | undefined;

  // TODO(burdon): Mermaid API requires unique id.
  constructor(
    private readonly _id: string,
    private readonly _source: string,
    private readonly _config: MermaidConfig,
    private readonly _label?: string,
  ) {
    super();
  }

  // The config too: a widget kept across a colour-mode switch would keep the old theme's SVG.
  override eq(other: this) {
    return this._source === other._source && this._config === other._config;
  }

  override ignoreEvent(ev: Event) {
    return !/^mouse/.test(ev.type);
  }

  override toDOM(view: EditorView) {
    const div = document.createElement('div');
    div.className = 'cm-mermaid';

    setTimeout(async () => {
      // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/config.type.ts
      // Global, so it is applied per render; the diagram-type style files list the selectors:
      // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/flowchart/styles.ts
      Mermaid.initialize(this._config);

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
      const valid = await Mermaid.parse(this._source);
      if (valid) {
        const result = await Mermaid.render(this._id, this._source);
        this._error = undefined;
        this._svg = result.svg;
        return result.svg;
      }
    } catch (err: any) {
      this._error = String(err);
      this._svg = undefined;
    }
  }
}
