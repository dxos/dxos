//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';

import { type WidgetMatcher, widgetMatchersFacet, widgetsCore } from '../widgets/index.ts';
import { type DiffRow, type ParsedDiff, languageLabel, parseDiff, parseFenceInfo } from './diff-parser.ts';
import { diffHighlightStyles, highlightLines } from './highlight.ts';
import { diffBlockTheme } from './theme.ts';

/** The fence language this extension claims. */
const DIFF_LANGUAGE = 'diff';

/**
 * Below `NARROW_WIDTH` the two columns no longer fit side by side; the block returns to them only
 * above `WIDE_WIDTH`. The gap is hysteresis: re-rendering changes the block's height, which can
 * add or remove the scroller's scrollbar and move the measured width back across a single
 * threshold, leaving the observer flip-flopping.
 */
const NARROW_WIDTH = 720;
const WIDE_WIDTH = 760;

/**
 * Heights assumed before the block mounts, so CodeMirror's viewport estimate is not wild. Taken
 * from the theme; a wrapped line still makes this an under-estimate, which is why the block
 * declares it rather than pinning it.
 */
const ROW_HEIGHT = 24;
const EXPANDER_HEIGHT = 38;
const CHROME_HEIGHT = 46;

export type DiffLayout = 'split' | 'inline' | 'auto';

export type DiffBlocksOptions = {
  /**
   * `split` renders before and after as two columns, `inline` as one unified column, and `auto`
   * (the default) picks by measured width — two columns of code are unreadable in a narrow pane.
   */
  layout?: DiffLayout;
  /** Syntax-highlight the code; the language is loaded lazily. Defaults to true. */
  highlight?: boolean;
  /**
   * Offers a comment button on each hovered line of a diff that names its file; called with the line
   * the reader picked and the button that was pressed, so a composer can be floated at that line.
   * Absent means no button.
   */
  onLineComment?: (target: DiffLineTarget, anchor: HTMLElement) => void;
};

/** A single line of a rendered diff, as a review comment addresses it. */
export type DiffLineTarget = {
  file: string;
  /** `before` is the removed/old column, `after` the added/new one (context lines count as `after`). */
  side: 'before' | 'after';
  /** 1-based line number in that version of the file. */
  line: number;
  text: string;
};

/**
 * Renders ```diff fenced blocks as diff chunks inside an otherwise ordinary markdown document, so a
 * walkthrough can interleave prose, headings and diagrams with the changes it narrates.
 *
 * This is deliberately not `@codemirror/merge`: both of its views take the WHOLE document as one
 * side of one diff, which cannot express "these ten lines are a diff and the rest is prose".
 *
 * The fence's info line carries the metadata a review header shows:
 * ```diff file=src/index.ts lines=66-99 lang=typescript```
 *
 * Blocks are atomic, as every widget from this registry is: the caret steps over a rendered chunk
 * rather than into it, and the fence is edited by replacing the block rather than in place.
 */
export const diffBlocks = (options: DiffBlocksOptions = {}): Extension => [
  widgetsCore,
  widgetMatchersFacet.of(createDiffMatcher(options)),
  diffBlockTheme,
  // The highlighted spans are static DOM, so the styles' rules are mounted directly rather than
  // through `syntaxHighlighting`, which would also restyle the host document.
  Object.values(diffHighlightStyles).flatMap((style) =>
    style.module ? [EditorView.styleModule.of(style.module)] : [],
  ),
];

/**
 * The fence's content, or undefined when it is not a diff. Sliced from the document rather than read
 * off the `CodeText` child because a fence whose language has a nested parser mounts that parser's
 * tree there, and the raw text is what needs parsing either way.
 */
export const parseDiffFence = (state: EditorState, node: SyntaxNodeRef): ParsedDiff | undefined => {
  const text = state.sliceDoc(node.from, node.to);
  const lines = text.split('\n');
  const opening = lines[0];
  const fence = /^\s*(`{3,}|~{3,})(.*)$/.exec(opening);
  if (!fence) {
    return undefined;
  }

  const info = parseFenceInfo(fence[2]);
  if (info.language !== DIFF_LANGUAGE) {
    return undefined;
  }

  // The closing fence is absent while the block is still being typed (or streamed in).
  const last = lines[lines.length - 1];
  const body = /^\s*(`{3,}|~{3,})\s*$/.test(last) ? lines.slice(1, -1) : lines.slice(1);
  return parseDiff(body.join('\n'), info);
};

const createDiffMatcher = (options: DiffBlocksOptions): WidgetMatcher => ({
  nodes: ['FencedCode'],
  match: (node, { state }) => {
    const parsed = parseDiffFence(state, node);
    if (!parsed || parsed.chunks.length === 0) {
      return undefined;
    }

    const { from, to } = node;
    return {
      from,
      to,
      decoration: Decoration.replace({
        block: true,
        widget: new DiffBlockWidget(parsed, state.sliceDoc(from, to), options),
      }),
    };
  },
});

//
// Widget
//

/** Where a rendered code cell gets its highlighted content from once the language resolves. */
type PendingCell = { element: HTMLElement; side: 'before' | 'after'; index: number };

/** What a widget renders as before the observer has measured it; `auto` starts split. */
const initialLayout = (layout?: DiffLayout): 'split' | 'inline' => (layout === 'inline' ? 'inline' : 'split');

/** Highlighting is on unless it was turned off, so absent and `true` are the same configuration. */
const highlighted = (options: DiffBlocksOptions): boolean => options.highlight !== false;

class DiffBlockWidget extends WidgetType {
  /** Cleared on destroy so a language that resolves after the widget is gone writes nothing. */
  #alive = true;
  #observer?: ResizeObserver;
  #layout: 'split' | 'inline';
  #root?: HTMLElement;
  #view?: EditorView;
  readonly #diff: ParsedDiff;
  /** The fence source, so a rebuilt widget over changed text is not reused. */
  readonly #source: string;
  readonly #options: DiffBlocksOptions;

  constructor(diff: ParsedDiff, source: string, options: DiffBlocksOptions) {
    super();
    this.#diff = diff;
    this.#source = source;
    this.#options = options;
    this.#layout = initialLayout(options.layout);
  }

  override eq(other: this): boolean {
    // Only the DEFAULTS are normalized: an absent layout means `auto` and an absent `highlight`
    // means on, so a widget configured either way renders identically and must not be torn down —
    // that would lose the collapse the reader toggled and the width the observer measured. `auto`
    // and `split` stay distinct despite both starting split, since only `auto` observes its width.
    return (
      this.#source === other.#source &&
      (this.#options.layout ?? 'auto') === (other.#options.layout ?? 'auto') &&
      highlighted(this.#options) === highlighted(other.#options) &&
      this.#options.onLineComment === other.#options.onLineComment
    );
  }

  override get estimatedHeight(): number {
    const lines = this.#diff.chunks.reduce(
      (count, chunk) =>
        count +
        // The unified layout renders a replaced pair as two lines, not one.
        chunk.rows.reduce((rows, row) => rows + (this.#layout === 'inline' && row.kind === 'changed' ? 2 : 1), 0),
      0,
    );
    const expanders = this.#diff.chunks.filter((chunk) => chunk.gap).length;
    return CHROME_HEIGHT + expanders * EXPANDER_HEIGHT + lines * ROW_HEIGHT;
  }

  /** The widget owns its interactions (collapse, expanders); the editor should not also act on them. */
  override ignoreEvent(): boolean {
    return true;
  }

  override destroy(): void {
    this.#alive = false;
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#view = undefined;
  }

  /**
   * CodeMirror caches a block widget's height, so collapsing one or reflowing its rows leaves every
   * position below it mapped against a height that no longer exists.
   */
  #remeasure(): void {
    this.#view?.requestMeasure();
  }

  override toDOM(view: EditorView): HTMLElement {
    // A widget may be re-rendered after a destroy; revive it so a resolving language still lands.
    this.#alive = true;
    this.#view = view;
    this.#observer?.disconnect();
    const root = document.createElement('div');
    root.className = 'cm-diff-block';
    this.#root = root;
    root.appendChild(this.#renderHeader());

    const body = root.appendChild(document.createElement('div'));
    body.className = 'cm-diff-body';
    this.#renderBody(body);

    if (this.#options.layout === 'auto' || this.#options.layout === undefined) {
      // Measured rather than a container query, because the two layouts are different DOM: a unified
      // row must not repeat a context line once per column.
      this.#observer = new ResizeObserver(([entry]) => {
        const { width } = entry.contentRect;
        const next = width < NARROW_WIDTH ? 'inline' : width > WIDE_WIDTH ? 'split' : this.#layout;
        if (next !== this.#layout) {
          this.#layout = next;
          this.#renderBody(body);
          this.#remeasure();
        }
      });
      this.#observer.observe(root);
    }

    return root;
  }

  #renderHeader(): HTMLElement {
    const { file, language, range, added, removed } = this.#diff;
    const header = document.createElement('div');
    header.className = 'cm-diff-header';

    const toggle = header.appendChild(document.createElement('button'));
    toggle.className = 'cm-diff-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Collapse');
    toggle.appendChild(caret());
    toggle.addEventListener('click', () => {
      const collapsed = header.parentElement?.classList.toggle('cm-diff-collapsed') ?? false;
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');
      this.#remeasure();
    });

    if (file) {
      const path = header.appendChild(document.createElement('span'));
      path.className = 'cm-diff-path';
      const separator = file.lastIndexOf('/');
      if (separator > 0) {
        const directory = path.appendChild(document.createElement('span'));
        directory.className = 'cm-diff-dir';
        directory.textContent = file.slice(0, separator + 1);
      }
      const name = path.appendChild(document.createElement('span'));
      name.className = 'cm-diff-name';
      name.textContent = separator > 0 ? file.slice(separator + 1) : file;
    }

    if (added > 0) {
      const stat = header.appendChild(document.createElement('span'));
      stat.className = 'cm-diff-stat cm-diff-stat-added';
      stat.textContent = `+${added}`;
    }
    if (removed > 0) {
      const stat = header.appendChild(document.createElement('span'));
      stat.className = 'cm-diff-stat cm-diff-stat-removed';
      stat.textContent = `-${removed}`;
    }

    const label = languageLabel(language);
    if (label) {
      const element = header.appendChild(document.createElement('span'));
      element.className = 'cm-diff-lang';
      element.textContent = label;
    }

    if (range) {
      const element = header.appendChild(document.createElement('span'));
      element.className = 'cm-diff-range';
      element.textContent = `Lines ${range.replace('-', '–')}`;
    }

    return header;
  }

  #renderBody(body: HTMLElement): void {
    body.textContent = '';
    body.dataset.layout = this.#layout;
    // Also on the root, so the header can drop what does not fit at the narrow layout's widths.
    if (this.#root) {
      this.#root.dataset.layout = this.#layout;
    }

    for (const chunk of this.#diff.chunks) {
      if (chunk.gap) {
        body.appendChild(expander(chunk.gap, chunk.section));
      }
      const grid = body.appendChild(document.createElement('div'));
      grid.className = 'cm-diff-grid';
      const pending: PendingCell[] = [];
      const before: string[] = [];
      const after: string[] = [];
      for (const row of chunk.rows) {
        if (this.#layout === 'split') {
          this.#renderSplitRow(grid, row, pending, before, after);
        } else {
          this.#renderInlineRow(grid, row, pending, before, after);
        }
      }

      // Per chunk rather than per side of the whole block: each chunk is its own window into the
      // file, read inside the declaration its hunk header names.
      if (highlighted(this.#options) && this.#diff.language) {
        void this.#highlight(this.#diff.language, chunk.section, before, after, pending);
      }
    }
  }

  #renderSplitRow(grid: HTMLElement, row: DiffRow, pending: PendingCell[], before: string[], after: string[]): void {
    const removal = row.kind === 'removed' || row.kind === 'changed';
    const addition = row.kind === 'added' || row.kind === 'changed';

    if (row.before) {
      grid.appendChild(number(row.before.number, removal ? '-' : undefined, removal ? 'removed' : undefined));
      const cell = grid.appendChild(code(row.before.text, removal ? 'removed' : undefined));
      this.#attachComment(cell, 'before', row.before.number, row.before.text);
      pending.push({ element: cell, side: 'before', index: before.length });
      before.push(row.before.text);
    } else {
      grid.appendChild(filler('cm-diff-num'));
      grid.appendChild(filler('cm-diff-line'));
    }

    if (row.after) {
      grid.appendChild(
        number(row.after.number, addition ? '+' : undefined, addition ? 'added' : undefined, 'cm-diff-split'),
      );
      const cell = grid.appendChild(code(row.after.text, addition ? 'added' : undefined));
      this.#attachComment(cell, 'after', row.after.number, row.after.text);
      pending.push({ element: cell, side: 'after', index: after.length });
      after.push(row.after.text);
    } else {
      grid.appendChild(filler('cm-diff-num', 'cm-diff-split'));
      grid.appendChild(filler('cm-diff-line'));
    }
  }

  #renderInlineRow(grid: HTMLElement, row: DiffRow, pending: PendingCell[], before: string[], after: string[]): void {
    // A `changed` row is one pairing for the split layout and two lines for the unified one.
    const lines: DiffRow[] =
      row.kind === 'changed'
        ? [
            { kind: 'removed', before: row.before },
            { kind: 'added', after: row.after },
          ]
        : [row];

    for (const line of lines) {
      const cell = line.before ?? line.after;
      if (!cell) {
        continue;
      }
      const status = line.kind === 'added' ? 'added' : line.kind === 'removed' ? 'removed' : undefined;
      grid.appendChild(number(line.before?.number, undefined, status));
      grid.appendChild(number(line.after?.number, undefined, status));
      grid.appendChild(mark(line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : '', status));
      const element = grid.appendChild(code(cell.text, status));
      // Context lines are highlighted from the `after` text, which holds every line the result has.
      const side = line.kind === 'removed' ? 'before' : 'after';
      const lineNumber = side === 'before' ? line.before?.number : line.after?.number;
      if (lineNumber !== undefined) {
        this.#attachComment(element, side, lineNumber, cell.text);
      }
      const source = side === 'before' ? before : after;
      pending.push({ element, side, index: source.length });
      source.push(cell.text);
    }
  }

  /** Adds the hover comment button to a code cell, when a callback was given and the diff names its file. */
  #attachComment(cell: HTMLElement, side: DiffLineTarget['side'], line: number, text: string): void {
    const { onLineComment } = this.#options;
    const { file } = this.#diff;
    if (!onLineComment || !file) {
      return;
    }
    cell.classList.add('cm-diff-commentable');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-diff-comment';
    button.setAttribute('aria-label', `Comment on line ${line}`);
    button.textContent = '+';
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onLineComment({ file, side, line, text }, button);
    });
    // Prepended so highlighting, which replaces the cell's text content, is applied after and must keep it.
    cell.prepend(button);
  }

  async #highlight(
    language: string,
    section: string | undefined,
    before: string[],
    after: string[],
    pending: PendingCell[],
  ): Promise<void> {
    const style = diffHighlightStyles[this.#view?.state.facet(EditorView.darkTheme) ? 'dark' : 'light'];
    const [beforeLines, afterLines] = await Promise.all([
      before.length > 0 ? highlightLines(before.join('\n'), language, section, style) : undefined,
      after.length > 0 ? highlightLines(after.join('\n'), language, section, style) : undefined,
    ]);
    if (!this.#alive || (!beforeLines && !afterLines)) {
      return;
    }

    for (const { element, side, index } of pending) {
      const fragment = (side === 'before' ? beforeLines : afterLines)?.[index];
      if (fragment) {
        // The comment button lives in the cell; keep it across the text swap.
        const button = element.querySelector(':scope > .cm-diff-comment');
        element.textContent = '';
        if (button) {
          element.appendChild(button);
        }
        element.appendChild(fragment);
      }
    }
  }
}

//
// Cells
//

const number = (value: number | undefined, marker?: string, status?: string, ...classes: string[]): HTMLElement => {
  const element = document.createElement('div');
  element.className = ['cm-diff-num', status && `cm-diff-${status}`, ...classes].filter(Boolean).join(' ');
  if (value !== undefined) {
    const digits = element.appendChild(document.createElement('span'));
    digits.textContent = String(value);
  }
  if (marker) {
    const sign = element.appendChild(document.createElement('span'));
    sign.className = 'cm-diff-sign';
    sign.textContent = marker;
  }

  return element;
};

const mark = (marker: string, status?: string): HTMLElement => {
  const element = document.createElement('div');
  element.className = ['cm-diff-mark', status && `cm-diff-${status}`].filter(Boolean).join(' ');
  element.textContent = marker;
  return element;
};

const code = (text: string, status?: string): HTMLElement => {
  const element = document.createElement('div');
  element.className = ['cm-diff-line', status && `cm-diff-${status}`].filter(Boolean).join(' ');
  // A blank line still needs to occupy its row.
  element.textContent = text.length > 0 ? text : ' ';
  return element;
};

/** The empty half of a one-sided row, hatched so it reads as absent rather than as a blank line. */
const filler = (kind: string, ...classes: string[]): HTMLElement => {
  const element = document.createElement('div');
  element.className = [kind, 'cm-diff-filler', ...classes].join(' ');
  return element;
};

const expander = (lines: number, section?: string): HTMLElement => {
  const element = document.createElement('div');
  element.className = 'cm-diff-expander';
  const icon = element.appendChild(arrow());
  icon.classList.add('cm-diff-expander-icon');
  const label = element.appendChild(document.createElement('span'));
  label.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}`;
  if (section) {
    const context = element.appendChild(document.createElement('span'));
    context.className = 'cm-diff-section';
    context.textContent = section;
  }

  return element;
};

//
// Icons
//

const svg = (path: string): SVGElement => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  element.setAttribute('viewBox', '0 0 16 16');
  element.setAttribute('fill', 'none');
  element.setAttribute('stroke', 'currentColor');
  element.setAttribute('stroke-width', '1.5');
  element.setAttribute('stroke-linecap', 'round');
  element.setAttribute('stroke-linejoin', 'round');
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('d', path);
  element.appendChild(shape);
  return element;
};

const caret = (): SVGElement => svg('M4 6l4 4 4-4');

const arrow = (): SVGElement => svg('M8 13V3M4 7l4-4 4 4');
