//
// Copyright 2024 DXOS.org
//

import { snippet } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import {
  type Extension,
  type StateCommand,
  RangeSetBuilder,
  type EditorState,
  type ChangeSpec,
  type Text,
  EditorSelection,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common';
import { useState, useMemo } from 'react';

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

export enum Inline {
  Strong = 0,
  Emphasis = 1,
  Strikethrough = 2,
  Code = 3,
}

export enum List {
  Ordered,
  Bullet,
  Task,
}

export type FormattingOptions = {};

export const setHeading =
  (level: number): StateCommand =>
  ({ state, dispatch }) => {
    const {
      selection: { ranges },
      doc,
    } = state;
    const changes: ChangeSpec[] = [];
    let prevBlock = -1;
    for (const range of ranges) {
      syntaxTree(state).iterate({
        from: range.from,
        to: range.to,
        enter: (node) => {
          if (!Object.hasOwn(Textblocks, node.name) || prevBlock === node.from) {
            return;
          }
          prevBlock = node.from;
          const blockType = Textblocks[node.name];
          const isHeading = /heading(\d)/.exec(blockType);
          const curLevel = isHeading ? +isHeading[1] : node.name === 'Paragraph' ? 0 : -1;
          if (curLevel < 0 || curLevel === level) {
            return;
          }
          if (curLevel === 0) {
            changes.push({ from: node.from, insert: '#'.repeat(level) + ' ' });
          } else if (node.name === 'SetextHeading1' || node.name === 'SetextHeading2') {
            // Change Setext heading to regular one
            const nextLine = doc.lineAt(node.to);
            if (level) {
              changes.push({ from: node.from, insert: '#'.repeat(level) + ' ' });
            }
            changes.push({ from: nextLine.from - 1, to: nextLine.to });
          } else {
            // Adjust the level of an ATX heading
            if (level === 0) {
              changes.push({ from: node.from, to: Math.min(node.to, node.from + curLevel + 1) });
            } else if (level < curLevel) {
              changes.push({ from: node.from, to: node.from + (curLevel - level) });
            } else {
              changes.push({ from: node.from, insert: '#'.repeat(level - curLevel) });
            }
          }
        },
      });
    }

    if (!changes.length) {
      return false;
    }
    dispatch(state.update({ changes, userEvent: 'format.setHeading', scrollIntoView: true }));
    return true;
  };

// TODO test around links
export const setStyle =
  (type: Inline, enable: boolean): StateCommand =>
  ({ state, dispatch }) => {
    const marker = inlineMarkerText(type);
    const changes = state.changeByRange((range) => {
      // Special case for markers directly around the cursor, which will often not be parsed as valid styling
      if (
        !enable &&
        range.empty &&
        state.doc.sliceString(range.from - marker.length, range.from + marker.length) === marker + marker
      ) {
        return {
          changes: { from: range.from - marker.length, to: range.from + marker.length },
          range: EditorSelection.cursor(range.from - marker.length),
        };
      }
      const changes: ChangeSpec[] = [];
      // Used to add insertions that should happen *after* any other
      // insertions at the same position.
      const changesAtEnd: ChangeSpec[] = [];
      let blockStart = -1;
      let blockEnd = -1;
      let startCovered: boolean | 'adjacent' = false;
      let endCovered: boolean | 'adjacent' = false;
      let { from, to } = range;
      // Iterate the selected range. For each textblock, determine a
      // start and end position, the overlap of the selected range and
      // the block's extent, that should be styled/unstyled.
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          const { name } = node;
          if (Object.hasOwn(Textblocks, name) && Textblocks[name] !== 'codeblock') {
            // Set up for this textblock
            blockStart = blockContentStart(node);
            blockEnd = blockContentEnd(node, state.doc);
            startCovered = endCovered = false;
          } else if (IgnoreInline.has(name)) {
            // Move endpoints out of markers
            if (node.from < from && node.to > from) {
              if (to === from) {
                to = node.to;
              }
              from = node.to;
            }
            if (node.from < to && node.to > to) {
              to = node.from;
            }
          } else if (Object.hasOwn(InlineMarker, name)) {
            // This is an inline marker node.
            const markType = InlineMarker[name];
            const size = inlineMarkerText(markType).length;
            const openEnd = node.from + size;
            const closeStart = node.to - size;
            // Determine whether the start/end of the range is covered
            // by this.
            if (markType === type) {
              if (openEnd <= from && closeStart >= from) {
                startCovered = openEnd === from ? 'adjacent' : true;
              }
              if (openEnd <= to && closeStart >= to) {
                endCovered = closeStart === to ? 'adjacent' : true;
              }
            }
            // Marks of the same type in range, or any mark if we're
            // adding code style, need to be removed.
            if (markType === type || (type === Inline.Code && enable)) {
              if (node.from >= from && openEnd <= to) {
                changes.push({ from: node.from, to: openEnd });
                if (markType !== type && closeStart >= to) {
                  // End marker outside, move start
                  changesAtEnd.push({
                    from: skipSpaces(Math.min(to, blockEnd), state.doc, 1, blockEnd),
                    insert: inlineMarkerText(markType),
                  });
                }
              }
              if (closeStart >= from && node.to <= to) {
                changes.push({ from: closeStart, to: node.to });
                if (markType !== type && openEnd <= from) {
                  // Start marker outside, move end
                  changes.push({
                    from: skipSpaces(Math.max(from, blockStart), state.doc, -1, blockStart),
                    insert: inlineMarkerText(markType),
                  });
                }
              }
            }
          }
        },
        leave: (node) => {
          if (Object.hasOwn(Textblocks, node.name) && Textblocks[node.name] !== 'codeblock') {
            // Finish opening/closing the marks for this textblock
            const rangeStart = Math.max(from, blockStart);
            const rangeEnd = Math.min(to, blockEnd);
            if (enable) {
              if (!startCovered) {
                changes.push({ from: rangeStart, insert: marker });
              }
              if (!endCovered) {
                changes.push({ from: rangeEnd, insert: marker });
              }
            } else {
              if (startCovered === 'adjacent') {
                changes.push({ from: from - marker.length, to: from });
              } else if (startCovered) {
                changes.push({ from: skipSpaces(rangeStart, state.doc, -1, blockStart), insert: marker });
              }
              if (endCovered === 'adjacent') {
                changes.push({ from: to, to: to + marker.length });
              } else if (endCovered) {
                changes.push({ from: skipSpaces(rangeEnd, state.doc, 1, blockEnd), insert: marker });
              }
            }
          }
        },
      });
      const changeSet = state.changes(changes.concat(changesAtEnd));
      return {
        changes: changeSet,
        range:
          range.empty && !changeSet.empty
            ? EditorSelection.cursor(range.head + inlineMarkerText(type).length)
            : EditorSelection.range(changeSet.mapPos(range.from, 1), changeSet.mapPos(range.to, -1)),
      };
    });

    dispatch(state.update(changes, { userEvent: 'format.addStyle', scrollIntoView: true }));
    return true;
  };

const blockContentStart = (node: SyntaxNodeRef) => {
  const atx = /^ATXHeading(\d)/.exec(node.name);
  if (atx) {
    return Math.min(node.to, node.from + +atx[1] + 1);
  }
  return node.from;
};

const blockContentEnd = (node: SyntaxNodeRef, doc: Text) => {
  const setext = /^SetextHeading(\d)/.exec(node.name);
  const lastLine = doc.lineAt(node.to);
  if (setext || /^[\s>]*$/.exec(lastLine.text)) {
    return lastLine.from - 1;
  }
  return node.to;
};

const inlineMarkerText = (type: Inline) =>
  type === Inline.Strong ? '**' : type === Inline.Strikethrough ? '~~' : type === Inline.Emphasis ? '*' : '`';

const skipSpaces = (pos: number, doc: Text, dir: -1 | 1, limit?: number) => {
  const line = doc.lineAt(pos);
  while (pos !== limit && line.text[pos - line.from - (dir < 0 ? 1 : 0)] === ' ') {
    pos += dir;
  }
  return pos;
};

export const addStyle = (style: Inline): StateCommand => setStyle(style, true);

export const removeStyle = (style: Inline): StateCommand => setStyle(style, false);

export const toggleStyle =
  (style: Inline): StateCommand =>
  (arg) => {
    const form = getFormatting(arg.state);
    return setStyle(
      style,
      style === Inline.Strong
        ? !form.strong
        : style === Inline.Emphasis
        ? !form.emphasis
        : style === Inline.Strikethrough
        ? !form.strikethrough
        : !form.code,
    )(arg);
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

export const toggleStrong = toggleStyle(Inline.Strong);
export const toggleEmphasis = toggleStyle(Inline.Emphasis);
export const toggleStrikethrough = toggleStyle(Inline.Strikethrough);
export const toggleInlineCode = toggleStyle(Inline.Code);

export const addList =
  (type: List): StateCommand =>
  ({ state, dispatch }) => {
    let lastBlock = -1;
    let counter = 1;
    let first = true;
    let parentColumn: number | null = null;
    const blocks: { node: SyntaxNode; counter: number; parentColumn: number | null }[] = [];
    // Scan the syntax tree to locate textblocks that can be wrapped
    for (const { from, to } of state.selection.ranges) {
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          if ((Object.hasOwn(Textblocks, node.name) && node.name !== 'TableCell') || node.name === 'Table') {
            if (first) {
              // For the first block, see if it follows a list, so we
              // can take indentation and numbering information from
              // that one
              let before = node.node.prevSibling;
              while (before && /Mark$/.test(before.name)) {
                before = before.prevSibling;
              }
              if (before?.name === (type === List.Ordered ? 'OrderedList' : 'BulletList')) {
                const item = before.lastChild!;
                const itemLine = state.doc.lineAt(item.from);
                const itemText = itemLine.text.slice(item.from - itemLine.from);
                parentColumn = item.from - itemLine.from + /^\s*/.exec(itemText)![0].length;
                if (type === List.Ordered) {
                  const mark = /^\s*(\d+)[.)]/.exec(itemText);
                  if (mark) {
                    parentColumn += mark[1].length;
                    counter = +mark[1] + 1;
                  }
                }
              }
              first = false;
            }
            if (node.from === lastBlock) {
              return;
            }
            lastBlock = node.from;
            blocks.push({ node: node.node, counter, parentColumn });
            counter++;
            return false;
          }
        },
        leave: (node) => {
          // When exiting block-level markup, reset the indentation and
          // counter
          if (node.name === 'BulletList' || node.name === 'OrderedList' || node.name === 'Blockquote') {
            counter = 1;
            parentColumn = null;
          }
        },
      });
    }
    if (!blocks.length) {
      return false;
    }

    const changes: ChangeSpec[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const { node, counter, parentColumn } = blocks[i];
      // Compute a padding based on whether we are after whitespace
      let padding = node.from > 0 && !/\s/.test(state.doc.sliceString(node.from - 1, node.from)) ? 1 : 0;
      // On ordered lists, the number is counted in the padding
      if (type === List.Ordered) {
        padding += String(counter).length;
      }
      let line = state.doc.lineAt(node.from);
      const column = node.from - line.from;
      // Align to the list above if possible
      if (parentColumn !== null && parentColumn > column) {
        padding = Math.max(padding, parentColumn - column);
      }

      let mark;
      if (type === List.Ordered) {
        // Scan ahead to find the max number we're adding, adjust
        // padding for that
        let max = counter;
        for (let j = i + 1; j < blocks.length; j++) {
          if (blocks[j].counter !== max + 1) {
            break;
          }
          max++;
        }
        const num = String(counter);
        padding = Math.max(String(max).length, padding);
        mark = ' '.repeat(Math.max(0, padding - num.length)) + num + '. ';
      } else {
        mark = ' '.repeat(padding) + '- ' + (type === List.Task ? '[ ] ' : '');
      }

      changes.push({ from: node.from, insert: mark });
      // Add indentation for the other lines in this block
      while (line.to < node.to) {
        line = state.doc.lineAt(line.to + 1);
        const open = /^[\s>]*/.exec(line.text)![0].length;
        changes.push({ from: line.from + Math.min(open, column), insert: ' '.repeat(mark.length) });
      }
    }
    // If we are inserting an ordered list and there is another one
    // right after the last selected block, renumber that one to match
    // the new order
    if (type === List.Ordered) {
      const last = blocks[blocks.length - 1];
      let next = last.node.nextSibling;
      while (next && /Mark$/.test(next.name)) {
        next = next.nextSibling;
      }
      if (next?.name === 'OrderedList') {
        renumberListItems(next.firstChild, last.counter + 1, changes, state.doc);
      }
    }
    dispatch(state.update({ changes, userEvent: 'format.addList', scrollIntoView: true }));
    return true;
  };

export const removeList =
  (type: List): StateCommand =>
  ({ state, dispatch }) => {
    let lastBlock = -1;
    const changes: ChangeSpec[] = [];
    const stack: string[] = [];
    const targetNodeType = type === List.Ordered ? 'OrderedList' : type === List.Bullet ? 'BulletList' : 'TaskList';
    // Scan the syntax tree to locate list items that can be unwrapped
    for (const { from, to } of state.selection.ranges) {
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          const { name } = node;
          if (name === 'BulletList' || name === 'OrderedList' || name === 'Blockquote') {
            // Maintain block context
            stack.push(name);
          } else if (name === 'Task' && stack[stack.length - 1] === 'BulletList') {
            stack[stack.length - 1] = 'TaskList';
          }
        },
        leave: (node) => {
          const { name } = node;
          if (name === 'BulletList' || name === 'OrderedList' || name === 'Blockquote') {
            stack.pop();
          } else if (name === 'ListItem' && stack[stack.length - 1] === targetNodeType && node.from !== lastBlock) {
            lastBlock = node.from;
            let line = state.doc.lineAt(node.from);
            const mark = /^\s*(\d+[.)] |[-*+] (\[[ x]\] )?)/.exec(line.text.slice(node.from - line.from));
            if (!mark) {
              return false;
            }
            const column = node.from - line.from;
            // Delete the marker on the first line
            changes.push({ from: node.from, to: node.from + mark[0].length });
            // and indentation on subsequent lines
            while (line.to < node.to) {
              line = state.doc.lineAt(line.to + 1);
              const open = /^[\s>]*/.exec(line.text)![0].length;
              if (open > column) {
                changes.push({ from: line.from + column, to: line.from + Math.min(column + mark[0].length, open) });
              }
            }
            if (node.to >= to) {
              renumberListItems(node.node.nextSibling, 1, changes, state.doc);
            }
            return false;
          }
        },
      });
    }
    if (!changes.length) {
      return false;
    }
    dispatch(state.update({ changes, userEvent: 'format.removeList', scrollIntoView: true }));
    return true;
  };

export const toggleList =
  (type: List): StateCommand =>
  (target) => {
    const formatting = getFormatting(target.state);
    const active =
      formatting.listStyle === (type === List.Bullet ? 'bullet' : type === List.Ordered ? 'ordered' : 'task');
    return (active ? removeList(type) : addList(type))(target);
  };

const renumberListItems = (item: SyntaxNode | null, counter: number, changes: ChangeSpec[], doc: Text) => {
  for (; item; item = item.nextSibling) {
    if (item.name === 'ListItem') {
      const number = /(\s*)(\d+)[.)]/.exec(doc.sliceString(item.from, item.from + 10));
      if (!number || +number[2] === counter) {
        break;
      }
      const size = number[1].length + number[2].length;
      const newNum = String(counter);
      changes.push({ from: item.from + Math.max(0, size - newNum.length), to: item.from + size, insert: newNum });
      counter++;
    }
  }
};

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

const Textblocks: { [name: string]: NonNullable<Formatting['blockType']> } = {
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

export const useFormattingState = (): [Formatting | null, Extension] => {
  const [state, setState] = useState<Formatting | null>(null);
  const observer = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
          setState(getFormatting(update.state));
        }
      }),
    [],
  );
  return [state, observer];
};
