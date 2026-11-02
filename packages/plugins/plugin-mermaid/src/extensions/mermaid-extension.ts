//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import Mermaid, { type MermaidConfig } from 'mermaid';

import { type DiagramCache, createDiagramCache } from './diagram-cache.ts';

export type MermaidOptions = Pick<MermaidConfig, 'theme' | 'themeVariables' | 'themeCSS'>;

/**
 * Ties the diagram to the design system on top of whichever theme is active. The SVG is inlined
 * into the editor, so `var(--color-…)` resolves against the page in both colour modes; mermaid's
 * own `themeVariables` cannot do this, since it derives a palette from them with colour math that
 * needs concrete colours.
 */
const DEFAULT_THEME_CSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path { fill: var(--color-card-surface); stroke: var(--color-separator); }
  .label text, .node text, .nodeLabel, .edgeLabel, .label span { color: var(--color-fg); fill: var(--color-fg); }
  .edgePath .path, .flowchart-link { stroke: var(--color-fg-subtle); }
  .edgeLabel { background-color: var(--color-group-surface); }
  .marker { fill: var(--color-fg-subtle); stroke: var(--color-fg-subtle); }
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

// Built once: every `EditorView.theme` call mints a new stylesheet, which restyles the whole document.
const mermaidTheme = EditorView.theme({
  '& .cm-mermaid': {
    position: 'relative',
    display: 'flex',
    width: '100%',
    margin: '4px 0',
    // The top band holds the label, so it never lies over the diagram's own top-right corner.
    padding: '28px 16px 16px',
    justifyContent: 'center',
    backgroundColor: 'var(--color-group-surface)',
    borderRadius: '8px',
  },
  '& .cm-mermaid-label': {
    position: 'absolute',
    top: '6px',
    right: '16px',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontFamily: 'unset',
    color: 'var(--color-fg-subtle)',
  },
  '& .cm-mermaid-error': {
    display: 'block',
    color: 'var(--color-error)',
  },
});

/**
 * Extension to create mermaid diagrams.
 *
 * The fenced source is highlighted while the cursor is inside the block (where this extension
 * suppresses the widget). That highlighting comes from `mermaidLanguageDescription`, registered in
 * `@dxos/ui-editor`'s markdown bundle rather than here: `codeLanguages` is read once when the
 * markdown parser is built, so an extension contributed afterwards cannot add a fenced-code language.
 */
export const mermaid = ({
  cache = createDiagramCache(),
  ...options
}: MermaidOptions & { cache?: DiagramCache } = {}): Extension => {
  // One config per colour mode, built once: the widget's identity includes its config, so a fresh
  // object per rebuild would replace (and re-render) every diagram on each selection change.
  const configs = {
    light: withKey(createConfig(options, false)),
    dark: withKey(createConfig(options, true)),
  };

  /**
   * Each mermaid block the cursor is outside of, replaced by its rendered diagram: a block widget over the block's
   * whole lines, so the lines around it (a blank line above and below) render as they are.
   */
  const buildDecorations = (state: EditorState): DecorationSet => {
    const decorations: Range<Decoration>[] = [];
    const cursor = state.selection.main.head;
    const config = state.facet(EditorView.darkTheme) ? configs.dark : configs.light;
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name !== 'FencedCode') {
          return;
        }
        // Editing shows the source; a buffer of one position either side handles the block's edges.
        if (!state.readOnly && cursor >= node.from - 1 && cursor <= node.to + 1) {
          return;
        }
        const info = node.node.getChild('CodeInfo');
        const text = node.node.getChild('CodeText');
        if (!info || !text || state.sliceDoc(info.from, info.to) !== 'mermaid') {
          return;
        }
        const content = state.sliceDoc(text.from, text.to).trim();
        // The diagram type, from its first line that is not a `%%` comment.
        const label =
          content
            .split('\n')
            .map((line) => line.trim())
            .find((line) => line.length > 0 && !line.startsWith('%%'))
            ?.split(/\s/)[0] ?? '';
        const widget = new MermaidWidget(cache, content, config.config, `${config.key}\n${content}`, label);
        const from = state.doc.lineAt(node.from).from;
        const to = state.doc.lineAt(node.to).to;
        decorations.push(Decoration.replace({ widget, block: true }).range(from, to));
      },
    });
    return Decoration.set(decorations, true);
  };

  return [
    // A state field rather than a view plugin: only a state field may provide block decorations.
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state),
      update: (decorations, tr) => {
        // The selection moves the widget out of the way while editing; a colour-mode switch arrives as a
        // reconfiguration; and the parser fills the tree in over time.
        const changed =
          tr.docChanged ||
          tr.selection !== undefined ||
          tr.state.facet(EditorView.darkTheme) !== tr.startState.facet(EditorView.darkTheme) ||
          syntaxTree(tr.state) !== syntaxTree(tr.startState);
        return changed ? buildDecorations(tr.state) : decorations;
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
    mermaidTheme,
  ];
};

/** A config with the key its diagrams are cached under. */
const withKey = (config: MermaidConfig) => ({ config, key: JSON.stringify(config) });

/** What a diagram not yet rendered this session reserves, so the text below it moves less when it arrives. */
const DIAGRAM_PLACEHOLDER = 240;

/** Mermaid removes the element with a render's id before rendering, so no two renders, cached or not, share one. */
let renders = 0;

class MermaidWidget extends WidgetType {
  constructor(
    private readonly _cache: DiagramCache,
    private readonly _source: string,
    private readonly _config: MermaidConfig,
    /** The config and source, which together decide what the diagram renders as. */
    private readonly _key: string,
    private readonly _label?: string,
  ) {
    super();
  }

  // The config too: a widget kept across a colour-mode switch would keep the old theme's SVG.
  override eq(other: this) {
    return this._key === other._key;
  }

  override get estimatedHeight() {
    return DIAGRAM_PLACEHOLDER;
  }

  override ignoreEvent(ev: Event) {
    return !/^mouse/.test(ev.type);
  }

  override toDOM(view: EditorView) {
    const div = document.createElement('div');
    div.className = 'cm-mermaid';

    const svg = this._cache.get(this._key);
    if (svg !== undefined) {
      this.fill(div, view, svg);
      return div;
    }
    div.style.minHeight = `${DIAGRAM_PLACEHOLDER}px`;

    setTimeout(async () => {
      // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/config.type.ts
      // Global, so it is applied per render; the diagram-type style files list the selectors:
      // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/flowchart/styles.ts
      Mermaid.initialize(this._config);
      try {
        // https://github.com/mermaid-js/mermaid
        await Mermaid.parse(this._source);
        const { svg } = await Mermaid.render(`mermaid-${++renders}`, this._source);
        this._cache.set(this._key, svg);
        this.fill(div, view, svg);
      } catch (err) {
        this.fill(div, view, undefined, String(err));
      }
    });

    return div;
  }

  private fill(div: HTMLElement, view: EditorView, svg: string | undefined, error?: string) {
    div.style.minHeight = '';
    if (svg === undefined) {
      div.className = 'cm-mermaid-error';
      div.innerText = error ?? '';
    } else {
      div.className = 'cm-mermaid';
      div.innerHTML = svg;
      if (this._label) {
        const label = document.createElement('span');
        label.innerText = this._label;
        label.className = 'cm-mermaid-label';
        div.appendChild(label);
      }
    }
    view.requestMeasure();
  }
}
