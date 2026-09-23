//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { type Tree } from '@lezer/common';

import { parseDiffFence } from './diff-block.ts';

/** Headings the outline is built from; deeper ones are noise in a rail this size. */
const HEADINGS: Record<string, number> = {
  ATXHeading1: 1,
  ATXHeading2: 2,
  ATXHeading3: 3,
  SetextHeading1: 1,
  SetextHeading2: 2,
};

/**
 * A heading's text without its markers.
 *
 * Only an ATX heading has them: CommonMark closes one with a run of `#` that is either preceded by
 * a space or is all that remains, and that run is syntax. An ATX heading ending in `C#` keeps its
 * hash, since no space separates it from the word. The gate on the node name is what makes the
 * setext entries in `HEADINGS` safe — a setext heading's line is literal — even though the markdown
 * configuration here currently parses one as a paragraph instead.
 */
const headingTitle = (node: string, text: string): string => {
  const line = text.split('\n')[0];
  if (!node.startsWith('ATXHeading')) {
    return line.trim();
  }

  return line
    .replace(/^#+\s*/, '')
    .replace(/(?:\s+|^)#+\s*$/, '')
    .trim();
};

/** One file under a section, as its own navigable row on the rail's second level. */
export type WalkthroughFile = {
  /** Document position of the file's first diff block, which its row scrolls to. */
  from: number;
  /** Base name, the only part that fits the rail's width. */
  name: string;
  added: number;
  removed: number;
};

export type WalkthroughEntry = {
  /** Document position the entry scrolls to. */
  from: number;
  level: number;
  title: string;
  /** The files whose diffs appear under this heading, in the order they first appear. */
  files: WalkthroughFile[];
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
        const title = headingTitle(node.name, state.sliceDoc(node.from, node.to));
        entries.push({ from: node.from, level, title, files: [], added: 0, removed: 0 });
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
          if (name) {
            // A file split across several chunks stays ONE row, carrying their combined counts,
            // and keeps the position of the first chunk so its row scrolls to the top of the file.
            const file = entry.files.find((candidate) => candidate.name === name);
            if (file) {
              file.added += diff.added;
              file.removed += diff.removed;
            } else {
              entry.files.push({ from: node.from, name, added: diff.added, removed: diff.removed });
            }
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
 * A navigation rail for a walkthrough document, on two levels: a row per section, and beneath it a
 * row per file it touches, each carrying its own change counts and each scrolling to what it names.
 * The row under the reader's eye is marked as current.
 *
 * Deliberately separate from {@link diffBlocks} — it only reads the document, so it can be added,
 * dropped or replaced by a host-rendered panel without touching how the chunks render.
 */
export const walkthroughSidebar = (options: WalkthroughSidebarOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      readonly #view: EditorView;
      readonly #rail: HTMLElement;
      readonly #onScroll = () => this.#scheduleMark();

      #entries: WalkthroughEntry[] = [];
      /** Every row on the rail, section and file alike, in document order — the navigable sequence. */
      #rows: { from: number; element: HTMLElement }[] = [];
      /** The tree the outline was read from, so a background parse advancing it rebuilds the rail. */
      #tree?: Tree;
      #frame?: number;

      constructor(view: EditorView) {
        this.#view = view;
        this.#rail = document.createElement('div');
        this.#rail.className = 'cm-walkthrough-sidebar';
        this.#rail.dataset.variant = options.variant ?? 'full';
        view.dom.appendChild(this.#rail);
        view.scrollDOM.addEventListener('scroll', this.#onScroll, { passive: true });
        this.#render();
      }

      update(update: ViewUpdate): void {
        // Not `docChanged` alone: a long document is parsed in the background, so the sections past
        // the first parse window appear on a later transaction that changes nothing — and a
        // read-only walkthrough never produces a document change at all.
        if (update.docChanged || syntaxTree(update.state) !== this.#tree) {
          this.#render();
        } else if (update.viewportChanged || update.geometryChanged) {
          this.#scheduleMark();
        }
      }

      destroy(): void {
        this.#view.scrollDOM.removeEventListener('scroll', this.#onScroll);
        if (this.#frame !== undefined) {
          cancelAnimationFrame(this.#frame);
        }
        this.#rail.remove();
      }

      #render(): void {
        this.#tree = syntaxTree(this.#view.state);
        const entries = walkthroughOutline(this.#view.state);
        // The tree advances far more often than the outline changes; rebuilding the DOM every time
        // would drop the rail's scroll position and restart its transitions.
        if (sameOutline(entries, this.#entries) && this.#rows.length > 0) {
          return;
        }

        this.#entries = entries;
        this.#rail.textContent = '';
        // An empty rail still paints a border and still insets the prose by its width.
        this.#rail.toggleAttribute('data-empty', entries.length === 0);
        this.#rows = [];
        const collapsed = (options.variant ?? 'full') === 'stats';
        for (const entry of entries) {
          // A section whose one file row repeats its totals shows them once, on the file; the
          // collapsed rail has no file rows, so there it keeps them.
          const ownCounts = collapsed || entry.files.length !== 1;
          this.#rows.push({
            from: entry.from,
            element: this.#addRow({
              className: 'cm-walkthrough-entry',
              level: entry.level,
              from: entry.from,
              text: entry.title,
              added: ownCounts ? entry.added : 0,
              removed: ownCounts ? entry.removed : 0,
              label: entryLabel(entry, ownCounts),
            }),
          });

          for (const file of entry.files) {
            this.#rows.push({
              from: file.from,
              element: this.#addRow({
                className: 'cm-walkthrough-file',
                level: entry.level,
                from: file.from,
                text: file.name,
                added: file.added,
                removed: file.removed,
                label: fileLabel(file),
              }),
            });
          }
        }

        this.#scheduleMark();
      }

      /** One navigable row: a name, its change counts, and the position it scrolls to. */
      #addRow(spec: {
        className: string;
        level: number;
        from: number;
        text: string;
        added: number;
        removed: number;
        label: string;
      }): HTMLElement {
        const row = this.#rail.appendChild(document.createElement('button'));
        row.type = 'button';
        row.className = spec.className;
        row.dataset.level = String(spec.level);
        row.addEventListener('click', () => {
          this.#view.dispatch({ effects: EditorView.scrollIntoView(spec.from, { y: 'start', yMargin: 24 }) });
        });

        const name = row.appendChild(document.createElement('span'));
        name.className = 'cm-walkthrough-name';
        name.textContent = spec.text;

        const stats = row.appendChild(document.createElement('span'));
        stats.className = 'cm-walkthrough-stats';
        if (spec.added > 0) {
          const added = stats.appendChild(document.createElement('span'));
          added.className = 'cm-walkthrough-added';
          added.textContent = `+${spec.added}`;
        }
        if (spec.removed > 0) {
          const removed = stats.appendChild(document.createElement('span'));
          removed.className = 'cm-walkthrough-removed';
          removed.textContent = `-${spec.removed}`;
        }

        // The `stats` variant hides the name, and a row with no counts then has no text at all;
        // name it from the outline either way.
        row.setAttribute('aria-label', spec.label);

        return row;
      }

      /**
       * Coalesced to one frame: a scroll event fires far faster than the rail can usefully change,
       * and marking reads the height map once per section.
       */
      #scheduleMark(): void {
        if (this.#frame !== undefined) {
          return;
        }
        this.#frame = requestAnimationFrame(() => {
          this.#frame = undefined;
          this.#markCurrent();
        });
      }

      /** The last row — section or file — whose target has passed the reading line. */
      #markCurrent(): void {
        const { scrollTop, clientHeight } = this.#view.scrollDOM;
        const line = scrollTop + clientHeight * (options.threshold ?? 0.25);
        let current = -1;
        for (let index = 0; index < this.#rows.length; index++) {
          // The height map, not `coordsAtPos`: a target scrolled out of the RENDERED range has no
          // coordinates, and a long section would then clear the mark rather than keep it.
          const block = this.#view.lineBlockAt(this.#rows[index].from);
          if (block.top <= line) {
            current = index;
          }
        }

        this.#rows.forEach(({ element }, index) => element.toggleAttribute('data-current', index === current));
      }
    },
  ),
  walkthroughSidebarTheme,
];

/** Accessible name for a rail button, from the outline rather than from whatever the variant shows. */
const entryLabel = (entry: WalkthroughEntry, ownCounts: boolean): string => {
  const parts = [entry.title || 'Untitled section'];
  if (entry.files.length > 0) {
    parts.push(entry.files.map((file) => file.name).join(', '));
  }
  const announced = ownCounts ? counts(entry) : '';
  if (announced.length > 0) {
    parts.push(announced);
  }
  return parts.join(' — ');
};

/** Built the way a row is, so a section with no removals is not announced as `-0`. */
const counts = ({ added, removed }: { added: number; removed: number }): string =>
  [added > 0 ? `+${added}` : undefined, removed > 0 ? `-${removed}` : undefined]
    .filter((count) => count !== undefined)
    .join(' ');

/** Accessible name for a file row, whose counts the `stats` variant shows without the name. */
const fileLabel = (file: WalkthroughFile): string => [file.name, counts(file)].filter(Boolean).join(' — ');

/** Whether the rail would render the same rows, so an unchanged outline does not rebuild it. */
const sameOutline = (left: WalkthroughEntry[], right: WalkthroughEntry[]): boolean =>
  left.length === right.length &&
  left.every((entry, index) => {
    const other = right[index];
    return (
      entry.from === other.from &&
      entry.title === other.title &&
      entry.level === other.level &&
      entry.added === other.added &&
      entry.removed === other.removed &&
      entry.files.length === other.files.length &&
      entry.files.every((file, fileIndex) => {
        const otherFile = other.files[fileIndex];
        return (
          file.from === otherFile.from &&
          file.name === otherFile.name &&
          file.added === otherFile.added &&
          file.removed === otherFile.removed
        );
      })
    );
  });

const walkthroughSidebarTheme = EditorView.theme({
  // The rail is absolutely positioned against the editor, which must therefore be its containing block.
  '&': { '--cm-walkthrough-width': '17rem', 'position': 'relative' },
  '&:has(.cm-walkthrough-sidebar[data-variant="stats"])': { '--cm-walkthrough-width': '6rem' },
  '.cm-walkthrough-sidebar': {
    position: 'absolute',
    insetBlock: '0',
    insetInlineEnd: '0',
    width: 'var(--cm-walkthrough-width)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.0625rem',
    padding: '1rem 0.5rem',
    overflowY: 'auto',
    borderInlineStart: '1px solid var(--color-subdued-separator)',
    fontFamily: 'var(--font-body)',
  },
  // The rail overlays the editor, so the text is inset by exactly its width.
  '.cm-scroller': { paddingInlineEnd: 'var(--cm-walkthrough-width)' },

  '.cm-walkthrough-entry, .cm-walkthrough-file': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'baseline',
    gap: '0 0.5rem',
    padding: '0.25rem 0.5rem',
    border: 'none',
    borderRadius: '0.375rem',
    background: 'transparent',
    textAlign: 'start',
    cursor: 'pointer',
  },
  '.cm-walkthrough-entry:hover, .cm-walkthrough-file:hover': { background: 'var(--color-hover-surface)' },
  '.cm-walkthrough-entry[data-current], .cm-walkthrough-file[data-current]': {
    background: 'var(--color-current-surface)',
  },
  '.cm-walkthrough-entry': { marginBlockStart: '0.75rem' },
  '.cm-walkthrough-entry:first-child': { marginBlockStart: '0' },
  '.cm-walkthrough-entry[data-level="3"] .cm-walkthrough-name': { paddingInlineStart: '0.75rem' },

  '.cm-walkthrough-entry .cm-walkthrough-name': {
    color: 'var(--color-base-fg)',
    fontSize: '0.8125rem',
  },
  // The second level: one file per row, indented under the section that touches it.
  '.cm-walkthrough-file': { paddingInlineStart: '1.25rem' },
  '.cm-walkthrough-file[data-level="3"]': { paddingInlineStart: '2rem' },
  '.cm-walkthrough-file .cm-walkthrough-name': {
    color: 'var(--color-subdued)',
    fontSize: '0.75rem',
  },
  '.cm-walkthrough-name': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-walkthrough-stats': {
    display: 'flex',
    gap: '0.25rem',
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
  },
  // Nothing to navigate: the rail neither paints nor insets the prose.
  '&:has(.cm-walkthrough-sidebar[data-empty])': { '--cm-walkthrough-width': '0px' },
  '.cm-walkthrough-sidebar[data-empty]': { display: 'none' },

  '.cm-walkthrough-added': { color: 'var(--color-cm-diff-add-gutter)' },
  '.cm-walkthrough-removed': { color: 'var(--color-cm-diff-remove-gutter)' },

  // Collapsed: the section counts alone, as a rail beside the prose — a per-file breakdown needs
  // the names beside it to mean anything.
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-name': { display: 'none' },
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-file': { display: 'none' },
  '.cm-walkthrough-sidebar[data-variant="stats"] .cm-walkthrough-entry': {
    gridTemplateColumns: 'minmax(0, 1fr)',
    justifyItems: 'end',
    minHeight: '1.75rem',
  },
});
