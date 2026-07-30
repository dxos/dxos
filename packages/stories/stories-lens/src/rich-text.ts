//
// Copyright 2026 DXOS.org
//

import { parser } from '@lezer/markdown';
import * as Schema from 'effect/Schema';

import { Lens } from '@dxos/echo-panproto';
import { Text } from '@dxos/schema';

//
// The rich-text lens: a `Text` object — whose `content` is a markdown string — viewed as a tree of
// blocks. A *coded* lens rather than a mapping, because no per-property correspondence can express
// parsing.
//
// The lens sits on `Text`, not on a document type: `Document.content` is a `Ref<Text>`, so lensing
// `Text` makes this reusable for every text-bearing type.
//
// The mechanism that makes it collaborative: every block carries the exact character range it came
// from, so an edit to one block becomes a `splice` over that range alone. Text outside the range is
// untouched, which is what lets a peer typing in the markdown editor merge with a peer editing a
// different block in the rich-text editor. Re-serializing the whole document would destroy both their
// cursors and each other's edits.
//

export type BlockType = 'heading' | 'paragraph' | 'bullet';

export type Mark = 'em' | 'strong' | 'code';

/** A run of text carrying zero or more inline marks — what makes the lensed view *rich* text. */
export const Inline = Schema.Struct({
  text: Schema.String,
  marks: Schema.optional(Schema.Array(Schema.Literal('em', 'strong', 'code'))),
});

export type Inline = Schema.Schema.Type<typeof Inline>;

export const Block = Schema.Struct({
  type: Schema.Literal('heading', 'paragraph', 'bullet'),
  /** Heading depth, 1-6; absent for other blocks. */
  level: Schema.optional(Schema.Number),
  /** The block's inline runs, with the markdown syntax that produced them stripped. */
  content: Schema.Array(Inline),
  /** `[start, end)` in the source string — the anchor a write splices over. */
  range: Schema.Tuple(Schema.Number, Schema.Number),
});

export type Block = Schema.Schema.Type<typeof Block>;

/** The block's text with marks flattened away, for assertions and plain-text consumers. */
export const blockText = (block: Block): string => block.content.map((run) => run.text).join('');

/** One unmarked run — the common case when constructing a block by hand. */
export const plain = (text: string): readonly Inline[] => (text.length > 0 ? [{ text }] : []);

/**
 * The lensed shape. A plain schema, not an ECHO type: no object of this shape is ever stored, so it
 * forfeits typename dispatch (see the package API doc) and exists purely as the contract the
 * rich-text editor is written against.
 */
export const RichText = Schema.Struct({
  blocks: Schema.Array(Block),
});

export type RichText = Schema.Schema.Type<typeof RichText>;

export const RICH_TEXT_LENS_ID = 'org.dxos.demo.lens.text-as-rich-text';

//
// Parsing. `@lezer/markdown` is already a dependency of `@dxos/react-ui-markdown` and every node
// carries `from`/`to` source offsets, which is exactly the anchor this lens needs — a parser without
// offsets would force whole-document rewrites on every edit.
//

const BLOCK_NODES: Record<string, BlockType> = {
  ATXHeading1: 'heading',
  ATXHeading2: 'heading',
  ATXHeading3: 'heading',
  ATXHeading4: 'heading',
  ATXHeading5: 'heading',
  ATXHeading6: 'heading',
  SetextHeading1: 'heading',
  SetextHeading2: 'heading',
  Paragraph: 'paragraph',
  ListItem: 'bullet',
};

const HEADING_LEVEL = /^(#{1,6})\s+/;

/** Marks lezer reports as their own nodes, and the delimiters that must not appear in the view. */
const MARK_NODES: Record<string, Mark> = { Emphasis: 'em', StrongEmphasis: 'strong', InlineCode: 'code' };
const DELIMITER_NODES = new Set(['EmphasisMark', 'CodeMark', 'HeaderMark', 'ListMark', 'QuoteMark']);

/** A heading's depth. The `#` run itself is a delimiter node, so it never reaches the view. */
const headingLevel = (source: string): number => {
  const match = source.match(HEADING_LEVEL);
  if (match) {
    return match[1].length;
  }
  // Setext: the underline on the following line decides.
  const underline = source.split('\n')[1] ?? '';
  return underline.trimStart().startsWith('=') ? 1 : 2;
};

/**
 * Split a block's source into marked runs.
 *
 * Marks come from the nodes lezer already identified (`Emphasis`, `StrongEmphasis`, `InlineCode`), and
 * their delimiters are dropped: the `**` belongs to the stored string, not to the view. Characters are
 * grouped by which set of marks covers them, so adjacent same-marked text stays one run.
 */
const inlineRuns = (
  content: string,
  from: number,
  to: number,
  marksAt: (index: number) => readonly Mark[],
  hidden: (index: number) => boolean,
): Inline[] => {
  const runs: Inline[] = [];
  for (let index = from; index < to; index++) {
    if (hidden(index)) {
      continue;
    }
    const marks = marksAt(index);
    const last = runs[runs.length - 1];
    const sameMarks =
      last && (last.marks ?? []).length === marks.length && (last.marks ?? []).every((mark, i) => mark === marks[i]);
    if (sameMarks) {
      runs[runs.length - 1] = { ...last, text: last.text + content[index] };
    } else {
      runs.push(marks.length > 0 ? { text: content[index], marks } : { text: content[index] });
    }
  }
  // Leading/trailing whitespace is block syntax, not content.
  if (runs.length > 0) {
    runs[0] = { ...runs[0], text: runs[0].text.replace(/^\s+/, '') };
    const lastIndex = runs.length - 1;
    runs[lastIndex] = { ...runs[lastIndex], text: runs[lastIndex].text.replace(/\s+$/, '') };
  }
  return runs.filter((run) => run.text.length > 0);
};

/** Parse markdown into blocks, each carrying the source range it came from and its marked runs. */
export const parseBlocks = (content: string): Block[] => {
  const tree = parser.parse(content);

  // Two passes: collect mark and delimiter spans first, so the block pass can consult them.
  const markSpans: { mark: Mark; from: number; to: number }[] = [];
  const hiddenSpans: { from: number; to: number }[] = [];
  const scan = tree.cursor();
  do {
    const mark = MARK_NODES[scan.name];
    if (mark) {
      markSpans.push({ mark, from: scan.from, to: scan.to });
    } else if (DELIMITER_NODES.has(scan.name)) {
      hiddenSpans.push({ from: scan.from, to: scan.to });
    }
  } while (scan.next());

  const marksAt = (index: number): readonly Mark[] =>
    markSpans.filter((span) => index >= span.from && index < span.to).map((span) => span.mark);
  const hidden = (index: number): boolean => hiddenSpans.some((span) => index >= span.from && index < span.to);

  const blocks: Block[] = [];
  const cursor = tree.cursor();
  do {
    const type = BLOCK_NODES[cursor.name];
    if (!type) {
      continue;
    }
    // A list item contains its own paragraph; keep the item and skip the nested duplicate.
    if (type === 'paragraph' && blocks.length > 0) {
      const previous = blocks[blocks.length - 1];
      if (previous.type === 'bullet' && cursor.from >= previous.range[0] && cursor.to <= previous.range[1]) {
        continue;
      }
    }
    const source = content.slice(cursor.from, cursor.to);
    blocks.push({
      type,
      level: type === 'heading' ? headingLevel(source) : undefined,
      content: inlineRuns(content, cursor.from, cursor.to, marksAt, hidden),
      range: [cursor.from, cursor.to],
    });
  } while (cursor.next());

  return blocks.sort((a, b) => a.range[0] - b.range[0]);
};

/** Wrap a run in the markdown syntax for its marks. Code innermost, then emphasis, then strong. */
const renderInline = (run: Inline): string => {
  const marks = new Set(run.marks ?? []);
  let text = run.text;
  if (marks.has('code')) {
    text = `\`${text}\``;
  }
  if (marks.has('em')) {
    text = `*${text}*`;
  }
  if (marks.has('strong')) {
    text = `**${text}**`;
  }
  return text;
};

/** Render one block back to the markdown that produced it, marks included. */
export const renderBlock = (block: Block): string => {
  const text = block.content.map(renderInline).join('');
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level ?? 1)} ${text}`;
    case 'bullet':
      return `- ${text}`;
    case 'paragraph':
      return text;
  }
};

/**
 * The writes that turn `previous` into `next`.
 *
 * Blocks are matched by position, so an edit to one block splices only its own range. Insertions and
 * deletions are handled at the tail, which is where a basic editor puts them; a reorder falls back to
 * rewriting the affected span. Nothing here ever rewrites the whole document.
 */
export const diffBlocks = (previous: readonly Block[], next: readonly Block[]): Lens.Write[] => {
  const writes: Lens.Write[] = [];
  const shared = Math.min(previous.length, next.length);

  // Later ranges shift when an earlier block changes length, so walk backwards: every splice below is
  // expressed in the ORIGINAL coordinates the blocks were parsed with.
  for (let index = shared - 1; index >= 0; index--) {
    const before = previous[index];
    const after = next[index];
    const rendered = renderBlock(after);
    if (rendered === renderBlock(before)) {
      continue;
    }
    writes.push({
      kind: 'splice',
      path: ['content'],
      start: before.range[0],
      deleteCount: before.range[1] - before.range[0],
      insert: rendered,
    });
  }

  if (next.length > previous.length) {
    // Appended blocks: one insert at the end of the last shared block.
    const at = previous.length > 0 ? previous[previous.length - 1].range[1] : 0;
    const added = next
      .slice(previous.length)
      .map((block) => renderBlock(block))
      .join('\n\n');
    writes.push({ kind: 'splice', path: ['content'], start: at, deleteCount: 0, insert: `\n\n${added}` });
  } else if (next.length < previous.length) {
    // Removed blocks: delete from the first dropped block to the end of the last.
    const from = previous[next.length].range[0];
    const to = previous[previous.length - 1].range[1];
    writes.push({ kind: 'splice', path: ['content'], start: from, deleteCount: to - from, insert: '' });
  }

  return writes;
};

/** `Text` → `RichText`. */
export const RichTextLens: Lens.Lens<Text.Text, RichText> = Lens.register(
  Lens.coded(RICH_TEXT_LENS_ID, Text.Text, RichText, {
    get: (text) => ({ blocks: parseBlocks(text.content ?? '') }),
    put: (next, previous) => diffBlocks(previous.blocks, next.blocks ?? previous.blocks),
  }),
);

export const DEMO_MARKDOWN = [
  '# One object, two editors',
  '',
  'The markdown on the left is **what is stored**. The blocks on the right are *a view of it*.',
  '',
  '## Why it merges',
  '',
  '- Each block remembers its `source range`',
  '- So an edit splices that range alone',
].join('\n');

export const makeDemoText = () => Text.make({ content: DEMO_MARKDOWN });
