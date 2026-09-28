//
// Copyright 2026 DXOS.org
//

import { EditorState, SelectionRange } from '@codemirror/state';
import { EditorView, type WidgetType } from '@codemirror/view';
import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { createMarkdownExtensions } from '../language/index.ts';
import { type DiffLayout, diffBlocks } from './diff-block.ts';
import { walkthroughOutline, walkthroughSidebar } from './sidebar.ts';

const DOC = [
  '# Walkthrough',
  '',
  'Some prose.',
  '',
  '## Harness wiring',
  '',
  '```diff file=src/harness.ts lines=10-12 lang=typescript',
  '@@ -10,2 +10,3 @@',
  ' const a = 1;',
  '-const b = 2;',
  '+const b = 3;',
  '```',
  '',
  'More prose.',
  '',
  '## Tests',
  '',
  '```ts',
  'const notADiff = true;',
  '```',
  '',
].join('\n');

describe('diffBlocks', () => {
  test('replaces a diff fence with one block widget', () => {
    const ranges = replacedRanges(DOC);
    expect(ranges).to.have.length(1);

    const [[from, to]] = ranges;
    expect(DOC.slice(from, from + 5)).to.eq('```di');
    expect(DOC.slice(to - 3, to)).to.eq('```');
  });

  test('leaves a fence in another language alone', () => {
    const ranges = replacedRanges(['```ts', 'const a = 1;', '```', ''].join('\n'));
    expect(ranges).to.have.length(0);
  });

  test('renders the block as an atomic range the caret steps over', () => {
    const view = new EditorView({ state: createState(DOC) });
    const [from, to] = replacedRanges(DOC)[0];

    const atomic = view.state
      .facet(EditorView.atomicRanges)
      .map((source) => source(view))
      .some((set) => {
        let covered = false;
        // The widget host widens a block's atomic range past its line breaks, so one caret step
        // clears the block; the range must still cover the replaced text.
        set.between(from, to, (rangeFrom, rangeTo) => {
          covered ||= rangeFrom <= from && rangeTo >= to;
        });
        return covered;
      });

    expect(atomic).to.eq(true);
    view.destroy();
  });
});

describe('DiffBlockWidget', () => {
  /** The widget the decoration carries, rendered as it would be in the editor. */
  const render = (doc: string, layout: DiffLayout): HTMLElement => {
    const view = new EditorView({
      state: EditorState.create({ doc, extensions: [createMarkdownExtensions(), diffBlocks({ layout })] }),
    });
    const [first] = blockWidgets(view);
    invariant(first, 'no diff widget');
    const dom = first.widget.toDOM(view);
    view.destroy();

    return dom;
  };

  test('renders the header from the fence metadata', () => {
    const dom = render(DOC, 'split');

    expect(dom.querySelector('.cm-diff-dir')?.textContent).to.eq('src/');
    expect(dom.querySelector('.cm-diff-name')?.textContent).to.eq('harness.ts');
    expect(dom.querySelector('.cm-diff-stat-added')?.textContent).to.eq('+1');
    expect(dom.querySelector('.cm-diff-stat-removed')?.textContent).to.eq('-1');
    expect(dom.querySelector('.cm-diff-lang')?.textContent).to.eq('TypeScript');
    expect(dom.querySelector('.cm-diff-range')?.textContent).to.eq('Lines 10–12');
  });

  test('splits a pure insertion into a coloured line and a filler', () => {
    const dom = render(
      ['```diff file=src/a.ts', '@@ -1,1 +1,2 @@', ' keep();', '+added();', '```'].join('\n'),
      'split',
    );

    // `children`, not a `>` selector: the test DOM counts nested spans as child matches.
    const grid = dom.querySelector('.cm-diff-grid');
    invariant(grid, 'no grid');
    const rows = [...grid.children];
    // Four cells per row: number and code for each side.
    expect(rows).to.have.length(8);
    expect(rows[5].classList.contains('cm-diff-filler')).to.eq(true);
    expect(rows[7].textContent).to.eq('added();');
    expect(rows[7].classList.contains('cm-diff-added')).to.eq(true);
  });

  test('unfolds a replacement into two lines when inline', () => {
    const dom = render(DOC, 'inline');

    const lines = [...dom.querySelectorAll('.cm-diff-line')].map((line) => line.textContent);
    expect(lines).to.deep.eq(['const a = 1;', 'const b = 2;', 'const b = 3;']);
    expect([...dom.querySelectorAll('.cm-diff-mark')].map((mark) => mark.textContent)).to.deep.eq(['', '-', '+']);
    // No fillers: the unified layout has nothing to leave empty.
    expect(dom.querySelectorAll('.cm-diff-filler')).to.have.length(0);
  });

  test('offers to expand the lines skipped above a chunk', () => {
    const dom = render(
      ['```diff file=src/a.ts', '@@ -21,1 +21,2 @@', ' keep();', '+added();', '```'].join('\n'),
      'split',
    );
    expect(dom.querySelector('.cm-diff-expander')?.textContent).to.contain('20 lines');
  });
});

describe('walkthroughOutline', () => {
  test('lists sections with the files and counts beneath them', () => {
    const outline = walkthroughOutline(createState(DOC));

    expect(outline.map((entry) => entry.title)).to.deep.eq(['Walkthrough', 'Harness wiring', 'Tests']);
    expect(outline.map((entry) => entry.level)).to.deep.eq([1, 2, 2]);

    const [, wiring, tests] = outline;
    expect(wiring.files.map((file) => file.name)).to.deep.eq(['harness.ts']);
    expect(wiring.files[0].added).to.eq(1);
    expect(wiring.files[0].removed).to.eq(1);
    expect(wiring.added).to.eq(1);
    expect(wiring.removed).to.eq(1);
    // A fence that is not a diff contributes nothing.
    expect(tests.files).to.deep.eq([]);
    expect(tests.added).to.eq(0);
  });

  test('sums every chunk under a heading, counting each exactly once', () => {
    const outline = walkthroughOutline(
      createState(
        [
          '## Section',
          '',
          '```diff file=src/a.ts',
          '@@ -1,1 +1,2 @@',
          ' keep();',
          '+one();',
          '```',
          '',
          'Prose between them.',
          '',
          '```diff file=src/b.ts',
          '@@ -1,2 +1,2 @@',
          ' keep();',
          '-old();',
          '+new();',
          '```',
          '',
        ].join('\n'),
      ),
    );

    expect(outline).to.have.length(1);
    // Two additions across two chunks, one removal — the section's own total, not a file's.
    expect(outline[0].added).to.eq(2);
    expect(outline[0].removed).to.eq(1);
    expect(outline[0].files.map((file) => file.name)).to.deep.eq(['a.ts', 'b.ts']);
    // Each file carries its OWN counts, which is what the second level of the rail renders.
    expect(outline[0].files.map((file) => [file.added, file.removed])).to.deep.eq([
      [1, 0],
      [1, 1],
    ]);
  });

  test('lists a file once however many chunks name it', () => {
    const outline = walkthroughOutline(
      createState(
        [
          '## Section',
          '',
          '```diff file=src/a.ts lines=1-2',
          '@@ -1,1 +1,2 @@',
          ' keep();',
          '+one();',
          '```',
          '',
          '```diff file=src/a.ts lines=90-91',
          '@@ -90,1 +90,2 @@',
          ' keep();',
          '+two();',
          '```',
          '',
        ].join('\n'),
      ),
    );

    expect(outline[0].files.map((file) => file.name)).to.deep.eq(['a.ts']);
    // The row carries both chunks' additions and scrolls to the first of them.
    expect(outline[0].files[0].added).to.eq(2);
    expect(outline[0].files[0].from).to.be.lessThan(outline[0].files[0].from + 1);
    expect(outline[0].added).to.eq(2);
  });

  test('drops the closing markers of a closed ATX heading', () => {
    const outline = walkthroughOutline(createState(['## Harness wiring ##', '', 'Prose.', ''].join('\n')));

    expect(outline[0].title).to.eq('Harness wiring');
  });

  test('reads a heading that is only a closing sequence as untitled', () => {
    const outline = walkthroughOutline(createState(['### ###', '', 'Prose.', ''].join('\n')));

    expect(outline[0].title).to.eq('');
  });

  test('keeps a hash the title itself ends with', () => {
    // Only whitespace-separated markers close a heading, so a language named `C#` survives.
    const outline = walkthroughOutline(createState(['## Porting to C#', '', 'Prose.', ''].join('\n')));

    expect(outline[0].title).to.eq('Porting to C#');
  });

  test('gives a diff above the first heading a lead section', () => {
    const outline = walkthroughOutline(
      createState(['```diff file=src/a.ts', '@@ -1,1 +1,1 @@', '+a;', '```', ''].join('\n')),
    );

    expect(outline).to.have.length(1);
    expect(outline[0].title).to.eq('');
    expect(outline[0].files.map((file) => file.name)).to.deep.eq(['a.ts']);
  });
});

describe('DiffBlockWidget equality', () => {
  test('reuses a widget across configurations that render the same', () => {
    const source = ['```diff file=src/a.ts', '@@ -1,1 +1,2 @@', ' keep();', '+one();', '```'].join('\n');
    const widget = (options: Parameters<typeof diffBlocks>[0]) => {
      const view = new EditorView({
        state: EditorState.create({ doc: source, extensions: [createMarkdownExtensions(), diffBlocks(options)] }),
      });
      const [found] = blockWidgets(view);
      view.destroy();
      invariant(found);
      return found.widget;
    };

    // An absent layout means `auto` and an absent `highlight` means on.
    expect(widget({}).eq(widget({ layout: 'auto', highlight: true }))).to.eq(true);
    expect(widget({}).eq(widget({ layout: 'inline' }))).to.eq(false);
    expect(widget({}).eq(widget({ highlight: false }))).to.eq(false);
    // `auto` and `split` both START split, but only `auto` observes its width, so a widget
    // configured one way cannot stand in for the other.
    expect(widget({ layout: 'auto' }).eq(widget({ layout: 'split' }))).to.eq(false);
  });
});

describe('walkthroughSidebar', () => {
  test('lists each file as its own row beneath its section', () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: [
          '## Section',
          '',
          '```diff file=src/a.ts',
          '@@ -1,1 +1,2 @@',
          ' keep();',
          '+one();',
          '```',
          '',
          '```diff file=src/b.ts',
          '@@ -1,2 +1,2 @@',
          ' keep();',
          '-old();',
          '+new();',
          '```',
          '',
        ].join('\n'),
        extensions: [createMarkdownExtensions(), diffBlocks(), walkthroughSidebar()],
      }),
    });

    const rail = view.dom.querySelector('.cm-walkthrough-sidebar');
    invariant(rail);
    const rows = Array.from(rail.querySelectorAll('button'));
    const files = Array.from(rail.querySelectorAll('.cm-walkthrough-file'));

    // One section row followed by one row per file, in document order.
    expect(rows.map((row) => row.className)).to.deep.eq([
      'cm-walkthrough-entry',
      'cm-walkthrough-file',
      'cm-walkthrough-file',
    ]);
    expect(files.map((row) => row.querySelector('.cm-walkthrough-name')?.textContent)).to.deep.eq(['a.ts', 'b.ts']);
    expect(files.map((row) => row.querySelector('.cm-walkthrough-added')?.textContent)).to.deep.eq(['+1', '+1']);
    expect(files.map((row) => row.querySelector('.cm-walkthrough-removed')?.textContent)).to.deep.eq([undefined, '-1']);
    view.destroy();
  });

  test('scrolls to the file a second-level row names', () => {
    const doc = [
      '## Section',
      '',
      '```diff file=src/a.ts',
      '@@ -1,1 +1,2 @@',
      ' keep();',
      '+one();',
      '```',
      '',
      '```diff file=src/b.ts',
      '@@ -1,1 +1,2 @@',
      ' keep();',
      '+two();',
      '```',
      '',
    ].join('\n');
    const scrolled: number[] = [];
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [createMarkdownExtensions(), diffBlocks(), walkthroughSidebar()],
      }),
      dispatchTransactions: (transactions) => {
        for (const transaction of transactions) {
          for (const effect of transaction.effects) {
            // The effect a row dispatches carries the range it would scroll into view.
            const { value } = effect;
            if (value instanceof Object && 'range' in value && value.range instanceof SelectionRange) {
              scrolled.push(value.range.from);
            }
          }
        }
      },
    });

    const rail = view.dom.querySelector('.cm-walkthrough-sidebar');
    invariant(rail);
    const rows = rail.querySelectorAll('.cm-walkthrough-file');
    const second = rows[1];
    invariant(second instanceof HTMLElement);
    second.click();
    view.destroy();

    expect(scrolled).to.deep.eq([doc.indexOf('```diff file=src/b.ts')]);
  });

  test('names every rail button, including in the stats variant that hides its text', () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: DOC,
        extensions: [createMarkdownExtensions(), diffBlocks(), walkthroughSidebar({ variant: 'stats' })],
      }),
    });

    const rail = view.dom.querySelector('.cm-walkthrough-sidebar');
    invariant(rail);
    const labels = Array.from(rail.querySelectorAll('button')).map((row) => row.getAttribute('aria-label'));
    view.destroy();

    expect(labels.length).to.be.greaterThan(0);
    expect(labels.every((label) => label && label.length > 0)).to.eq(true);
    expect(labels[0]).to.eq('Walkthrough');
    expect(labels[1]).to.eq('Harness wiring — harness.ts — +1 -1');
    // The file's own row, named without its section.
    expect(labels[2]).to.eq('harness.ts — +1 -1');
  });

  test('leaves a count the row does not show out of the name', () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: [
          '## Additions only',
          '',
          '```diff file=src/a.ts',
          '@@ -1,1 +1,2 @@',
          ' keep();',
          '+one();',
          '```',
          '',
        ].join('\n'),
        extensions: [createMarkdownExtensions(), diffBlocks(), walkthroughSidebar()],
      }),
    });

    const rail = view.dom.querySelector('.cm-walkthrough-sidebar');
    invariant(rail);
    const label = rail.querySelector('button')?.getAttribute('aria-label');
    view.destroy();

    // The one file row below carries the counts, so the section's name does not repeat them.
    expect(label).to.eq('Additions only — a.ts');
  });

  test('leaves the counts to the file row when a section has exactly one file', () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: [
          '## One file',
          '',
          '```diff file=src/a.ts',
          '@@ -1,2 +1,2 @@',
          ' keep();',
          '-old();',
          '+new();',
          '```',
          '',
        ].join('\n'),
        extensions: [createMarkdownExtensions(), diffBlocks(), walkthroughSidebar()],
      }),
    });

    const rail = view.dom.querySelector('.cm-walkthrough-sidebar');
    invariant(rail);
    const counts = Array.from(rail.querySelectorAll('button')).map((row) =>
      Array.from(row.querySelectorAll('.cm-walkthrough-added, .cm-walkthrough-removed')).map(
        (count) => count.textContent,
      ),
    );
    view.destroy();

    // The section row is bare; only the file row states `+1 -1`.
    expect(counts).to.deep.eq([[], ['+1', '-1']]);
  });

  test('keeps the section total when the files below it do not repeat it', () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: [
          '## Two files',
          '',
          '```diff file=src/a.ts',
          '@@ -1,1 +1,2 @@',
          ' keep();',
          '+one();',
          '```',
          '',
          '```diff file=src/b.ts',
          '@@ -1,1 +1,2 @@',
          ' keep();',
          '+two();',
          '```',
          '',
        ].join('\n'),
        extensions: [createMarkdownExtensions(), diffBlocks(), walkthroughSidebar()],
      }),
    });

    const rail = view.dom.querySelector('.cm-walkthrough-sidebar');
    invariant(rail);
    const section = rail.querySelector('.cm-walkthrough-entry');
    const total = section?.querySelector('.cm-walkthrough-added')?.textContent;
    view.destroy();

    expect(total).to.eq('+2');
  });
});

const createState = (doc: string) =>
  EditorState.create({ doc, extensions: [createMarkdownExtensions(), diffBlocks()] });

/** Every block-replacing widget decoration the view would render. */
const blockWidgets = (view: EditorView): { from: number; to: number; widget: WidgetType }[] => {
  const found: { from: number; to: number; widget: WidgetType }[] = [];
  for (const source of view.state.facet(EditorView.decorations)) {
    // Only the widget field replaces whole blocks; the markdown decorations are marks and lines.
    const set = typeof source === 'function' ? source(view) : source;
    const cursor = set.iter();
    while (cursor.value) {
      const { block, widget } = cursor.value.spec ?? {};
      if (block && widget) {
        found.push({ from: cursor.from, to: cursor.to, widget });
      }
      cursor.next();
    }
  }

  return found;
};

/** The block decorations the editor would render, as `[from, to]` pairs. */
const replacedRanges = (doc: string): [number, number][] => {
  const view = new EditorView({ state: createState(doc) });
  const ranges = blockWidgets(view).map(({ from, to }): [number, number] => [from, to]);
  view.destroy();

  return ranges;
};
