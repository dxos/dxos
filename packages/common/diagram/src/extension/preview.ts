//
// Copyright 2026 DXOS.org
//

// The package compiles without DOM; this widget is its only browser-facing code.
/// <reference lib="dom" />

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import * as EffectEx from '@dxos/effect/EffectEx';

import { compile } from '../dsl/compile.ts';
import * as SvgFile from '../svg-file.ts';

/** Fence info strings that `diagramBlockDescription` parses as the diagram DSL. */
const FENCE_NAMES = new Set(['diagram', 'dxd']);

/** Renders kept by source text, so re-decorating after an unrelated edit does not lay the diagram out again. */
const MAX_RENDERS = 32;

export type DiagramRender =
  | { readonly svg: string; readonly width: number; readonly height: number }
  | { readonly error: string };

const renders = new Map<string, Promise<DiagramRender>>();

/** Renders that have finished, so a widget can be drawn at its final size synchronously. */
const settled = new Map<string, DiagramRender>();

/** Width the editor's text column usually has, for estimating a diagram's height before it is measured. */
const ESTIMATED_COLUMN_WIDTH = 720;

const PREVIEW_PADDING = 24 + 16;

/** Lays out one diagram DSL source and serializes it as a standalone SVG document. */
export const renderDiagram = (source: string): Promise<DiagramRender> => {
  const cached = renders.get(source);
  if (cached) {
    return cached;
  }
  const pending = EffectEx.runPromise(compile(source))
    .then(
      ({ commands, problems }): DiagramRender => {
        const objects = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
        if (objects.length === 0) {
          return {
            error: problems.find((problem) => problem.severity === 'error')?.message ?? 'The diagram is empty.',
          };
        }
        const svg = SvgFile.toSvgFile(objects);
        const [, width = '0', height = '0'] = /<svg [^>]*?width="([\d.]+)" height="([\d.]+)"/.exec(svg) ?? [];
        return { svg, width: Number(width), height: Number(height) };
      },
      (error: unknown): DiagramRender => ({ error: error instanceof Error ? error.message : String(error) }),
    )
    .then((result) => {
      // A render evicted while pending must not repopulate the cache it was dropped from.
      if (renders.get(source) === pending) {
        settled.set(source, result);
      }
      return result;
    });
  if (renders.size >= MAX_RENDERS) {
    const oldest = renders.keys().next();
    if (!oldest.done) {
      renders.delete(oldest.value);
      settled.delete(oldest.value);
    }
  }
  renders.set(source, pending);
  return pending;
};

class DiagramWidget extends WidgetType {
  constructor(readonly source: string) {
    super();
  }

  override eq(other: DiagramWidget): boolean {
    return other.source === this.source;
  }

  override get estimatedHeight(): number {
    const result = settled.get(this.source);
    if (result && 'svg' in result && result.width > 0) {
      return Math.min(result.height, (result.height * ESTIMATED_COLUMN_WIDTH) / result.width) + PREVIEW_PADDING;
    }
    return 320;
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-diagram-preview';
    // A collapsed fence has no text to click into, so clicking the diagram moves the cursor into its source.
    container.addEventListener('mousedown', (event) => {
      event.preventDefault();
      view.dispatch({ selection: { anchor: view.posAtDOM(container) } });
      view.focus();
    });
    const show = (result: DiagramRender) => {
      if ('svg' in result) {
        // An <img> isolates the SVG's stylesheet and marker ids; its width and height reserve the final size before it decodes.
        const image = document.createElement('img');
        // The fence's source is hidden while the diagram replaces it, so the image carries it as its text.
        image.alt = `Diagram: ${this.source.trim()}`;
        image.width = result.width;
        image.height = result.height;
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`;
        container.replaceChildren(image);
      } else {
        container.classList.add('cm-diagram-preview-error');
        container.textContent = result.error;
      }
    };
    // A widget whose size changes after mount shifts everything below it, which moves the reader's scroll position.
    const ready = settled.get(this.source);
    if (ready) {
      show(ready);
    } else {
      container.style.minHeight = `${this.estimatedHeight}px`;
      container.textContent = 'Rendering diagram…';
      void renderDiagram(this.source).then((result) => {
        container.style.minHeight = '';
        show(result);
        view.requestMeasure();
      });
    }
    return container;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

/** Whether any selection range touches `[from, to]`, so the fence's source should show. */
const isEditing = (state: EditorState, from: number, to: number): boolean =>
  state.selection.ranges.some((range) => range.from <= to && range.to >= from);

/**
 * One rendered diagram per ```diagram fence the markdown tree holds: in place of the fence while the
 * selection is elsewhere, and below its source while the selection is inside it.
 */
export const buildDiagramPreviews = (state: EditorState): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'FencedCode') {
        return;
      }
      const info = node.node.getChild('CodeInfo');
      const body = node.node.getChild('CodeText');
      if (info && body && FENCE_NAMES.has(state.doc.sliceString(info.from, info.to).trim())) {
        const source = state.doc.sliceString(body.from, body.to);
        // Laid out ahead of scrolling, so a widget that mounts later is drawn at its final size at once.
        void renderDiagram(source);
        const widget = new DiagramWidget(source);
        if (isEditing(state, node.from, node.to)) {
          builder.add(node.to, node.to, Decoration.widget({ widget, block: true, side: 1 }));
        } else {
          builder.add(node.from, node.to, Decoration.replace({ widget, block: true }));
        }
      }
      return false;
    },
  });
  return builder.finish();
};

/** Block decorations must come from state, not a view plugin, so the previews live in a field. */
const previews = StateField.define<DecorationSet>({
  create: buildDiagramPreviews,
  update: (value, transaction) =>
    transaction.docChanged ||
    transaction.selection ||
    syntaxTree(transaction.state) !== syntaxTree(transaction.startState)
      ? buildDiagramPreviews(transaction.state)
      : value,
  provide: (field) => EditorView.decorations.from(field),
});

// The render's colours are drawn for a white ground, so the frame stays white in both themes.
const theme = EditorView.baseTheme({
  '.cm-diagram-preview': {
    margin: '8px 0',
    padding: '12px',
    borderRadius: '6px',
    background: '#ffffff',
    color: '#525252',
    overflowX: 'auto',
    fontSize: '12px',
  },
  '.cm-diagram-preview:has(img)': { cursor: 'pointer' },
  '.cm-diagram-preview img': { display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto' },
  '.cm-diagram-preview-error': { color: '#dc2626' },
});

/**
 * Renders every ```diagram fence in a markdown document: in place of its source, which reappears
 * (with the diagram below it) while the selection is inside the fence. Pair it with
 * `diagramBlockDescription` in `createMarkdownExtensions({ codeLanguages })` for highlighting.
 */
export const diagramPreview = (): Extension => [previews, theme];
