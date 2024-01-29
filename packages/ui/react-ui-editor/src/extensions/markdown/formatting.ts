//
// Copyright 2024 DXOS.org
//

import { snippet } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder, type EditorState } from '@codemirror/state';
import {
  type Command,
  Decoration,
  type DecorationSet,
  type EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common';

// Describes the formatting situation of the selection in an editor
// state. For inline styles `strong`, `emphasis`, `strikethrough`, and
// `code`, the field only holds true when *all* selected text has the
// style, or when the selection is a cursor inside such a style.
export type Formatting = {
  // The type of the block at the selection. If multiple different
  // block types are selected, this will hold null.
  blockType:
    | 'paragraph'
    | 'tablecell'
    | 'codeblock'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'heading4'
    | 'heading5'
    | 'heading6'
    | null;
  // Whether the selected text is strong.
  strong: boolean;
  // Whether the selected text is emphasized.
  emphasis: boolean;
  // Whether the selected text is stricken through.
  strikethrough: boolean;
  // Whether the selected text is inline code.
  code: boolean;
  // Whether there are links in the selected text.
  link: boolean;
  // If all selected blocks have the same (innermost) list style, that
  // is indicated here.
  listStyle: null | 'ordered' | 'bullet' | 'task';
  // Whether all selected text is wrapped in a blockquote.
  blockquote: boolean;
};

export const emptyFormatting: Formatting = {
  blockType: 'paragraph',
  strong: false,
  emphasis: false,
  strikethrough: false,
  code: false,
  link: false,
  listStyle: null,
  blockquote: false,
};

export type FormattingOptions = {};

export const setHeading =
  (level: number): Command =>
  (view: EditorView) => {
    const {
      selection: { ranges },
      doc,
    } = view.state;
    const changes = [];
    for (const range of ranges) {
      const { number } = doc.lineAt(range.anchor);
      const { from, to } = doc.line(number);

      // Check heading doesn't already exist.
      const line = doc.sliceString(from, to);
      const [_, marks, spaces] = line.match(/(#+)(\s+)/) ?? [];
      const current = marks?.length ?? 0;
      if (level !== current) {
        changes.push({
          from,
          to: from + current + (spaces?.length ?? 0),
          insert: '#'.repeat(level) + (level > 0 ? ' ' : ''),
        });
      }
    }

    if (changes.length) {
      view.dispatch({ changes });
    }

    return true;
  };

export const toggleStyle =
  (mark: string): Command =>
  (view) => {
    const { ranges } = view.state.selection;
    for (const range of ranges) {
      if (range.from === range.to) {
        return false;
      }

      // TODO(burdon): Detect if already styled (or nested).
      view.dispatch({
        changes: [
          {
            from: range.from,
            insert: mark,
          },
          {
            from: range.to,
            insert: mark,
          },
        ],
      });
    }

    return true;
  };

// TODO(burdon): Define and trigger snippets for codeblock, table, etc.
const snippets = {
  codeblock: snippet(['```#{lang}', '\t#{}', '```'].join('\n')),
  table: snippet(
    ['| #{col1} | #{col2} |', '| ---- | ---- |', '| #{val1} | #{val2} |', '| #{val3} | #{val4} |'].join('\n'),
  ),
};

export const insertCodeblock = (view: EditorView) => {
  const {
    selection: { main },
    doc,
  } = view.state;
  const { number } = doc.lineAt(main.anchor);
  const { from } = doc.line(number);
  snippets.codeblock(view, null, from, from);
};

export const insertTable = (view: EditorView) => {
  const {
    selection: { main },
    doc,
  } = view.state;
  const { number } = doc.lineAt(main.anchor);
  const { from } = doc.line(number);
  snippets.table(view, null, from, from);
};

export const toggleStrong = toggleStyle('**');
export const toggleEmphasis = toggleStyle('_');
export const toggleStrikethrough = toggleStyle('~~');
export const toggleInlineCode = toggleStyle('`');

export const toggleList = (view: EditorView) => {};

export const formatting = (options: FormattingOptions = {}): Extension => {
  return [
    keymap.of([
      {
        key: 'meta-b',
        run: toggleStrong,
      },
    ]),
    styling(),
  ];
};

// https://github.github.com/gfm
// https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax

const styling = (): Extension => {
  const buildDecorations = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const { state } = view;
    const cursor = state.selection.main.head;

    // TODO(burdon): Bug if '***foo***' (since StrongEmphasis is nested inside EmphasisMark).
    //  Ranges must be added sorted by `from` position and `startSide`.
    const replace = (node: SyntaxNodeRef, marks: SyntaxNode[]) => {
      if (cursor <= node.from || cursor >= node.to) {
        for (const mark of marks) {
          builder.add(mark.from, mark.to, Decoration.replace({}));
        }
      }
    };

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(state).iterate({
        enter: (node) => {
          switch (node.name) {
            case 'Emphasis':
            case 'StrongEmphasis': {
              const marks = node.node.getChildren('EmphasisMark');
              replace(node, marks);
              break;
            }

            case 'Strikethrough': {
              const marks = node.node.getChildren('StrikethroughMark');
              replace(node, marks);
              break;
            }
          }
        },
        from,
        to,
      });
    }

    return builder.finish();
  };

  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
          this.decorations = buildDecorations(update.view);
        }
      },
      {
        decorations: (value) => value.decorations,
      },
    ),
  ];
};

const enum Inline {
  Strong = 0,
  Emphasis = 1,
  Strikethrough = 2,
  Code = 3,
}

const InlineMarker: { [name: string]: number } = {
  Emphasis: Inline.Emphasis,
  StrongEmphasis: Inline.Strong,
  InlineCode: Inline.Code,
  Strikethrough: Inline.Strikethrough,
};

const IgnoreInline = new Set([
  'Hardbreak',
  'HTMLTag',
  'Comment',
  'ProcessingInstruction',
  'Autolink',
  'HeaderMark',
  'QuoteMark',
  'ListMark',
  'LinkMark',
  'EmphasisMark',
  'CodeMark',
  'CodeText',
  'StrikethroughMark',
  'TaskMarker',
  'SuperscriptMark',
  'SubscriptMark',
]);

const Textblocks: { [name: string]: Formatting['blockType'] } = {
  Paragraph: 'paragraph',
  Task: 'paragraph',
  CodeBlock: 'codeblock',
  FencedCode: 'codeblock',
  ATXHeading1: 'heading1',
  ATXHeading2: 'heading2',
  ATXHeading3: 'heading3',
  ATXHeading4: 'heading4',
  ATXHeading5: 'heading5',
  ATXHeading6: 'heading6',
  SetextHeading1: 'heading1',
  SetextHeading2: 'heading2',
  TableCell: 'tablecell',
};

// Query an editor state for the active formatting at the selection.
export const getFormatting = (state: EditorState): Formatting => {
  // These will track the formatting we've seen so far.
  // False indicates mixed block types.
  let blockType: Formatting['blockType'] | false = null;
  // Indexed by the Inline enum, tracks inline markup. null = no text
  // seen, true = all text had the mark, false = saw text without it.
  const inline: (boolean | null)[] = [null, null, null, null];
  let link: boolean = false;
  let blockquote: boolean | null = null;
  // False indicates mixed list styles
  let listStyle: Formatting['listStyle'] | null | false = null;

  // Track block context for list/blockquote handling.
  const stack: ('BulletList' | 'OrderedList' | 'Blockquote' | 'TaskList')[] = [];
  // This is set when entering a textblock (paragraph, heading, etc)
  // and cleared when exiting again. It is used to track inline style.
  // `active` holds an array that indicates, for the various style
  // (`Inline` enum) whether they are currently active.
  let currentBlock: { pos: number; end: number; active: boolean[] } | null = null;
  // Advance over regular inline text. Will update `inline` depending
  // on what styles are active.
  const advanceInline = (upto: number) => {
    if (!currentBlock) {
      return;
    }
    upto = Math.min(upto, currentBlock.end);
    if (upto <= currentBlock.pos) {
      return;
    }
    for (let i = 0; i < currentBlock.active.length; i++) {
      if (inline[i] === false) {
        continue;
      } else if (currentBlock.active[i]) {
        inline[i] = true;
      } else if (/\S/.test(state.doc.sliceString(currentBlock.pos, upto))) {
        inline[i] = false;
      }
    }
    currentBlock.pos = upto;
  };
  // Skip markup that shouldn't be treated as inline text for
  // style-tracking purposes.
  const skipInline = (upto: number) => {
    if (currentBlock && upto > currentBlock.pos) {
      currentBlock.pos = Math.min(upto, currentBlock.end);
    }
  };

  const { selection } = state;
  for (const range of selection.ranges) {
    syntaxTree(state).iterate({
      from: range.from,
      to: range.to,
      enter: (node) => {
        advanceInline(node.from);
        const { name } = node;
        if (name === 'BulletList' || name === 'OrderedList' || name === 'Blockquote') {
          // Maintain block context
          stack.push(name);
        } else if (name === 'Link') {
          link = true;
        } else if (Object.hasOwn(Textblocks, name) && (range.empty || node.to > range.from || node.from < range.to)) {
          if (name === 'Task' && stack[stack.length - 1] === 'BulletList') {
            stack[stack.length - 1] = 'TaskList';
          }
          const blockCode = Textblocks[name];
          if (blockType === null) {
            blockType = blockCode;
          } else if (blockType !== blockCode) {
            blockType = false;
          }
          if (blockCode !== 'codeblock' && inline.some((i) => i !== false)) {
            // Set up inline content tracking for non-code textblocks
            currentBlock = {
              pos: Math.max(range.from, node.from),
              end: Math.min(range.to, node.to),
              active: [false, false, false, false],
            };
          }
        } else if (Object.hasOwn(InlineMarker, name) && currentBlock) {
          const index = InlineMarker[name];
          // Cursors selections always count as active.
          if (range.empty && inline[index] === null) {
            inline[index] = true;
          }
          currentBlock.active[index] = true;
        } else if (IgnoreInline.has(name)) {
          skipInline(node.to);
        }
      },
      leave: (node) => {
        advanceInline(node.to);
        const { name } = node;
        if (name === 'BulletList' || name === 'OrderedList' || name === 'Blockquote') {
          // Track block context
          stack.pop();
        } else if (Object.hasOwn(Textblocks, name)) {
          // Scan the stack for blockquote/list context. Done at end
          // of node because task lists aren't recognized until a task
          // is seen
          let hasList: Formatting['listStyle'] | false = false;
          let hasQuote = false;
          for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i] === 'Blockquote') {
              hasQuote = true;
            } else if (!hasList) {
              hasList = stack[i] === 'TaskList' ? 'task' : stack[i] === 'BulletList' ? 'bullet' : 'ordered';
            }
          }
          if (blockquote === null) {
            blockquote = hasQuote;
          } else if (!hasQuote && blockquote) {
            blockquote = false;
          }
          if (listStyle === null) {
            listStyle = hasList;
          } else if (listStyle !== hasList) {
            listStyle = false;
          }

          // End textblock
          currentBlock = null;
        } else if (Object.hasOwn(InlineMarker, name) && currentBlock) {
          // Track markup in textblock
          currentBlock.active[InlineMarker[name]] = false;
        }
      },
    });
  }

  return {
    blockType: blockType || null,
    strong: inline[Inline.Strong] ?? false,
    emphasis: inline[Inline.Emphasis] ?? false,
    code: inline[Inline.Code] ?? false,
    strikethrough: inline[Inline.Strikethrough] ?? false,
    link,
    blockquote: blockquote ?? false,
    listStyle: listStyle || null,
  };
};
