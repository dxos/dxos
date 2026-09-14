//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { parseDiffFence } from './diff-block.ts';

/** Headings the outline is built from; deeper ones are noise in a rail this size. */
const HEADINGS: Record<string, number> = {
  ATXHeading1: 1,
  ATXHeading2: 2,
  ATXHeading3: 3,
  SetextHeading1: 1,
  SetextHeading2: 2,
};

export type WalkthroughEntry = {
  /** Document position the entry scrolls to. */
  from: number;
  level: number;
  title: string;
  /** Base names of the files whose diffs appear under this heading. */
  files: string[];
  added: number;
  removed: number;
};

/**
 * The document's sections and the diff blocks beneath each, in document order. Exported so a host
 * can render its own navigation from the same reading of the document the rail uses.
 */
export const walkthroughOutline = (state: EditorState): WalkthroughEntry[] => {
  const entries: WalkthroughEntry[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      const level = HEADINGS[node.name];
      if (level) {
        const text = state
          .sliceDoc(node.from, node.to)
          .replace(/^#+\s*/, '')
          .split('\n')[0]
          .trim();
        entries.push({ from: node.from, level, title: text, files: [], added: 0, removed: 0 });
        return false;
      }

      if (node.name === 'FencedCode') {
        const diff = parseDiffFence(state, node);
        if (diff) {
          // A diff before any heading still belongs somewhere; give it an untitled lead section.
          const entry = entries.at(-1) ?? { from: 0, level: 1, title: '', files: [], added: 0, removed: 0 };
          if (entries.length === 0) {
            entries.push(entry);
          }
          const name = diff.file?.split('/').pop();
          if (name && !entry.files.includes(name)) {
            entry.files.push(name);
          }
          entry.added += diff.added;
          entry.removed += diff.removed;
        }
        return false;
      }

      return undefined;
    },
  });

  return entries;
};

export type WalkthroughSidebarOptions = {
  /** `stats` shows change counts only, the rail Graphite collapses to; `full` adds titles and files. */
  variant?: 'full' | 'stats';
  /** Fraction of the viewport height at which an entry becomes the current one. */
  threshold?: number;
};

/**
 * A navigation rail for a walkthrough document: one row per section, carrying the files it touches
 * and their change counts, with the section under the reader's eye marked as current.
 *
 * Deliberately separate from {@link diffBlocks} — it only reads the document, so it can be added,
 * dropped or replaced by a host-rendered panel without touching how the chunks render.
 */
export const walkthroughSidebar = (options: WalkthroughSidebarOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      readonly #rail: HTMLElement;
      readonly #onScroll = () => this.#markCurrent();

      #entries: WalkthroughEntry[] = [];
      #rows: HTMLElement[] = [];

      constructor(private readonly _view: EditorView) {
        this.#rail = document.createElement('div');
        this.#rail.className = 'cm-walkthrough-sidebar';
        this.#rail.dataset.variant = options.variant ?? 'full';
        _view.dom.appendChild(this.#rail);
        _view.scrollDOM.addEventListener('scroll', this.#onScroll, { passive: true });
        this.#render();
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.#render();
        } else if (update.viewportChanged || update.geometryChanged) {
          this.#scheduleMark();
        }
      }

      destroy(): void {
        this._view.scrollDOM.removeEventListener('scroll', this.#onScroll);
        this.#rail.remove();
      }

      #render(): void {
        this.#entries = walkthroughOutline(this._view.state);
        this.#rail.textContent = '';
        this.#rows = this.#entries.map((entry) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'cm-walkthrough-entry';
          row.dataset.level = String(entry.level);
          row.addEventListener('click', () => {
            this._view.dispatch({ effects: EditorView.scrollIntoView(entry.from, { y: 'start', yMargin: 24 }) });
          });

          const title = row.appendChild(document.createElement('span'));
          title.className = 'cm-walkthrough-title';
          title.textContent = entry.title;

          if (entry.files.length > 0) {
            const files = row.appendChild(document.createElement('span'));
            files.className = 'cm-walkthrough-files';
            files.textContent = entry.files.join(', ');
          }

          const stats = row.appendChild(document.createElement('span'));
          stats.className = 'cm-walkthrough-stats';
          if (entry.added > 0) {
            const added = stats.appendChild(document.createElement('span'));
            added.className = 'cm-walkthrough-added';
            added.textContent = `+${entry.added}`;
          }
          if (entry.removed > 0) {
            const removed = stats.appendChild(document.createElement('span'));
            removed.className = 'cm-walkthrough-removed';
            removed.textContent = `-${entry.removed}`;
          }

          this.#rail.appendChild(row);
          return row;
        });

        this.#scheduleMark();
      }

      /** Layout may not be read during an update, and both callers run inside one. */
      #scheduleMark(): void {
        this._view.requestMeasure({ read: () => this.#markCurrent() });
      }

      /** The last section whose heading has passed the reading line. */
      #markCurrent(): void {
        const { top, height } = this._view.scrollDOM.getBoundingClientRect();
        const line = top + height * (options.threshold ?? 0.25);
        let current = -1;
        for (let index = 0; index < this.#entries.length; index++) {
          // A heading outside the rendered viewport has no coordinates; its neighbours still decide.
          const coords = this._view.coordsAtPos(this.#entries[index].from);
          if (coords && coords.top <= line) {
            current = index;
          }
        }

        this.#rows.forEach((row, index) => row.toggleAttribute('data-current', index === current));
      }
    },
  ),
  walkthroughSidebarTheme,
];

const walkthroughSidebarTheme = EditorView.theme({
  // The rail is absolutely positioned against the editor, which must therefore be its containing block.
  '&': { '--cm-walkthrough-width': '17rem', 'position': 'relative' },
  '&:has(.cm-walkthrough-sidebar[data-variant="stats"])': { '--cm-walkthrough-width': '6rem' },
  '.cm-walkthrough-sidebar': {
    position: 'absolute',
    insetBlock: '0',
    insetInlineStart: '0',
    width: 'var(--cm-walkthrough-width)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
    padding: '1rem 0.5rem',
    overflowY: 'auto',
    borderInlineEnd: '1px solid var(--color-subdued-separator)',
    fontFamily: 'var(--font-body)',
  },
  // The rail overlays the editor, so the text is inset by exactly its width.
  '.cm-scroller': { paddingInlineStart: 'var(--cm-walkthrough-width)' },

  '.cm-walkthrough-entry': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'baseline',
    gap: '0 0.5rem',
    padding: '0.375rem 0.5rem',
    border: 'none',
    borderRadius: '0.375rem',
    background: 'transparent',
    textAlign: 'start',
    cursor: 'pointer',
  },
  '.cm-walkthrough-entry:hover': { background: 'var(--color-hover-surface)' },
  '.cm-walkthrough-entry[data-current]': { background: 'var(--color-current-surface)' },
  '.cm-walkthrough-entry[data-level="2"]': { marginBlockStart: '0.75rem' },
  '.cm-walkthrough-entry[data-level="3"] .cm-walkthrough-title': { paddingInlineStart: '0.75rem' },

  '.cm-walkthrough-title': {
    color: 'var(--color-base-fg)',
    fontSize: '0.8125rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-walkthrough-files': {
    gridColumn: '1',
    color: 'var(--color-subdued)',
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-walkthrough-entry[data-level="3"] .cm-walkthrough-files': { paddingInlineStart: '0.75rem' },
  '.cm-walkthrough-stats': {
    gridColumn: '2',
    gridRow: '1',
    display: 'flex',
    gap: '0.25rem',
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
  },
  '.cm-walkthrough-added': { color: 'var(--color-cm-diff-add-gutter)' },
  '.cm-walkthrough-removed': { color: 'var(--color-cm-diff-remove-gutter)' },

  // Collapsed: the change counts alone, as a rail beside the prose.
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-title': { display: 'none' },
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-files': { display: 'none' },
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-entry': {
    gridTemplateColumns: 'minmax(0, 1fr)',
    justifyItems: 'end',
    minHeight: '1.75rem',
  },
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-stats': { gridColumn: '1' },
});
