//
// Copyright 2024 DXOS.org
//

import { snippet } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import {
  type Extension,
  type StateCommand,
  type EditorState,
  type ChangeSpec,
  type Text,
  EditorSelection,
  type Line,
} from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common';
import { useMemo, useState } from 'react';

// Markdown refs:
// https://github.github.com/gfm
// https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax

// Describes the formatting situation of the selection in an editor state.
// For inline styles `strong`, `emphasis`, `strikethrough`, and `code`,
// the field only holds true when *all* selected text has the style,
// or when the selection is a cursor inside such a style.
export type Formatting = {
  blankLine: boolean;
  // The type of the block at the selection.
  // If multiple different block types are selected, this will hold null.
  blockType:
    | 'codeblock'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'heading4'
    | 'heading5'
    | 'heading6'
    | 'paragraph'
    | 'tablecell'
    | null;
  // Whether all selected text is wrapped in a blockquote.
  blockQuote: boolean;
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
  // If all selected blocks have the same (innermost) list style, that is indicated here.
  listStyle: null | 'ordered' | 'bullet' | 'task';
};

export const formattingEquals = (a: Formatting, b: Formatting) =>
  a.blockType === b.blockType &&
  a.strong === b.strong &&
  a.emphasis === b.emphasis &&
  a.strikethrough === b.strikethrough &&
  a.code === b.code &&
  a.link === b.link &&
  a.listStyle === b.listStyle &&
  a.blockQuote === b.blockQuote;

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

//
// Headings
//

export const setHeading = (level: number): StateCommand => {
  return ({ state, dispatch }) => {
    const {
      selection: { ranges },
      doc,
    } = state;
    const changes: ChangeSpec[] = [];
    let prevBlock = -1;
    for (const range of ranges) {
      let sawBlock = false;
      syntaxTree(state).iterate({
        from: range.from,
        to: range.to,
        enter: (node) => {
          if (!Object.hasOwn(Textblocks, node.name) || prevBlock === node.from) {
            return;
          }
          sawBlock = true;
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
            // Change Setext heading to regular one.
            const nextLine = doc.lineAt(node.to);
            if (level) {
              changes.push({ from: node.from, insert: '#'.repeat(level) + ' ' });
            }
            changes.push({ from: nextLine.from - 1, to: nextLine.to });
          } else {
            // Adjust the level of an ATX heading.
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
      let line;
      if (!sawBlock && range.empty && level > 0 && !/\S/.test((line = state.doc.lineAt(range.from)).text)) {
        changes.push({ from: line.from, to: line.to, insert: '#'.repeat(level) + ' ' });
      }
    }

    if (!changes.length) {
      return false;
    }

    const changeSet = state.changes(changes);
    dispatch(
      state.update({
        changes: changeSet,
        selection: state.selection.map(changeSet, 1),
        userEvent: 'format.setHeading',
        scrollIntoView: true,
      }),
    );
    return true;
  };
};

//
// Styles
//

export const setStyle = (type: Inline, enable: boolean): StateCommand => {
  return ({ state, dispatch }) => {
    const marker = inlineMarkerText(type);
    const changes = state.changeByRange((range) => {
      // Special case for markers directly around the cursor, which will often not be parsed as valid styling.
      if (!enable && range.empty) {
        const after = state.doc.sliceString(range.head, range.head + 6);
        const found = after.indexOf(marker);
        if (found >= 0 && /^[*~`]*$/.test(after.slice(0, found))) {
          const before = state.doc.sliceString(range.head - 6, range.head);
          if (
            before.slice(before.length - found - marker.length, before.length - found) === marker &&
            [...before.slice(before.length - found)].reverse().join('') === after.slice(0, found)
          ) {
            return {
              changes: [
                { from: range.head - marker.length - found, to: range.head - found },
                { from: range.head + found, to: range.head + found + marker.length },
              ],
              range: EditorSelection.cursor(range.from - marker.length),
            };
          }
        }
      }

      const changes: ChangeSpec[] = [];
      // Used to add insertions that should happen *after* any other insertions at the same position.
      const changesAtEnd: ChangeSpec[] = [];
      let blockStart = -1;
      let blockEnd = -1;
      let startCovered: boolean | { from: number; to: number } = false;
      let endCovered: boolean | { from: number; to: number } = false;
      let { from, to } = range;

      // Iterate the selected range. For each textblock, determine a start and end position,
      // the overlap of the selected range and the block's extent, that should be styled/unstyled.
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          const { name } = node;
          if (Object.hasOwn(Textblocks, name) && Textblocks[name] !== 'codeblock') {
            // Set up for this textblock.
            blockStart = blockContentStart(node);
            blockEnd = blockContentEnd(node, state.doc);
            startCovered = endCovered = false;
          } else if (name === 'Link' || (name === 'Image' && enable)) {
            // If the range partially overlaps a link or image, expand it to cover it.
            if (from < node.from && to > node.from && to <= node.to) {
              to = node.to;
            } else if (to > node.to && from >= node.from && from < node.to) {
              from = node.from;
            }
          } else if (IgnoreInline.has(name) && enable) {
            // Move endpoints out of markers.
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
                startCovered =
                  !enable && openEnd === skipMarkers(from, node.node, -1, openEnd)
                    ? { from: node.from, to: openEnd }
                    : true;
              }
              if (openEnd <= to && closeStart >= to) {
                endCovered =
                  !enable && closeStart === skipMarkers(to, node.node, 1, closeStart)
                    ? { from: closeStart, to: node.to }
                    : true;
              }
            }
            // Marks of the same type in range, or any mark if we're adding code style, need to be removed.
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
            // Finish opening/closing the marks for this textblock.
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
              if (typeof startCovered === 'object') {
                changes.push(startCovered);
              } else if (startCovered) {
                changes.push({ from: skipSpaces(rangeStart, state.doc, -1, blockStart), insert: marker });
              }
              if (typeof endCovered === 'object') {
                changes.push(endCovered);
              } else if (endCovered) {
                changes.push({ from: skipSpaces(rangeEnd, state.doc, 1, blockEnd), insert: marker });
              }
            }
          }
        },
      });

      if (blockStart < 0 && range.empty && enable && !/\S/.test(state.doc.lineAt(range.from).text)) {
        return {
          changes: { from: range.head, insert: marker + marker },
          range: EditorSelection.cursor(range.head + marker.length),
        };
      }

      const changeSet = state.changes(changes.concat(changesAtEnd));
      return {
        changes: changeSet,
        range:
          range.empty && !changeSet.empty
            ? EditorSelection.cursor(range.head + marker.length)
            : EditorSelection.range(changeSet.mapPos(range.from, 1), changeSet.mapPos(range.to, -1)),
      };
    });

    dispatch(
      state.update(changes, {
        userEvent: enable ? 'format.style.add' : 'format.style.remove',
        scrollIntoView: true,
      }),
    );

    return true;
  };
};

export const addStyle = (style: Inline): StateCommand => setStyle(style, true);

export const removeStyle = (style: Inline): StateCommand => setStyle(style, false);

export const toggleStyle = (style: Inline): StateCommand => {
  return (arg) => {
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
};

export const toggleStrong = toggleStyle(Inline.Strong);
export const toggleEmphasis = toggleStyle(Inline.Emphasis);
export const toggleStrikethrough = toggleStyle(Inline.Strikethrough);
export const toggleInlineCode = toggleStyle(Inline.Code);

const inlineMarkerText = (type: Inline) =>
  type === Inline.Strong ? '**' : type === Inline.Strikethrough ? '~~' : type === Inline.Emphasis ? '*' : '`';

//
// Utils
//

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

const skipSpaces = (pos: number, doc: Text, dir: -1 | 1, limit?: number) => {
  const line = doc.lineAt(pos);
  while (pos !== limit && line.text[pos - line.from - (dir < 0 ? 1 : 0)] === ' ') {
    pos += dir;
  }
  return pos;
};

const skipMarkers = (pos: number, tree: SyntaxNode, dir: -1 | 1, limit?: number) => {
  for (;;) {
    const next = tree.resolve(pos, dir);
    if (!IgnoreInline.has(next.name)) {
      return pos;
    }
    const moveTo = dir < 0 ? next.from : next.to;
    if (limit != null && (dir < 0 ? moveTo < limit : moveTo > limit)) {
      return pos;
    }
    pos = moveTo;
  }
};

// TODO(burdon): Define and trigger snippets for codeblock, table, etc.
const snippets = {
  codeblock: snippet(
    [
      //
      '```#{}',
      '',
      '```',
    ].join('\n'),
  ),
  table: snippet(
    [
      //
      '| #{col1} | #{col2} |',
      '| ---- | ---- |',
      '| #{val1} | #{val2} |',
      '| #{val3} | #{val4} |',
      '',
    ].join('\n'),
  ),
};

//
// Table
//

export const insertTable = (view: EditorView) => {
  const {
    selection: { main },
    doc,
  } = view.state;
  const { number } = doc.lineAt(main.anchor);
  const { from } = doc.line(number);

  snippets.table(view, null, from, from);
};

//
// Links
//

// For each link in the given range, remove the link markup
const removeLinkInner = (from: number, to: number, changes: ChangeSpec[], state: EditorState) => {
  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      if (node.name === 'Link' && node.from < to && node.to > from) {
        node.node.cursor().iterate((node) => {
          const { name } = node;
          if (name === 'LinkMark' || name === 'LinkLabel') {
            changes.push({ from: node.from, to: node.to });
          } else if (name === 'LinkTitle' || name === 'URL') {
            changes.push({ from: skipSpaces(node.from, state.doc, -1), to: skipSpaces(node.to, state.doc, 1) });
          }
        });
        return false;
      }
    },
  });
};

// Remove all links touching the selection
export const removeLink: StateCommand = ({ state, dispatch }) => {
  const changes: ChangeSpec[] = [];
  for (const { from, to } of state.selection.ranges) {
    removeLinkInner(from, to, changes, state);
  }
  if (!changes) {
    return false;
  }
  dispatch(state.update({ changes, userEvent: 'format.link.remove', scrollIntoView: true }));
  return true;
};

// Add link markup around the selection.
export const addLink = ({ url, image }: { url?: string; image?: boolean } = {}): StateCommand => {
  return ({ state, dispatch }) => {
    const changes = state.changeByRange((range) => {
      let { from, to } = range;
      const cutStyles: SyntaxNode[] = [];
      let okay: boolean | null = null;
      // Check whether this range is in a position where a link makes sense.
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          if (Object.hasOwn(Textblocks, node.name)) {
            // If the selection spans multiple textblocks or is in a code block, abort.
            okay =
              Textblocks[node.name] !== 'codeblock' &&
              from >= blockContentStart(node) &&
              to <= blockContentEnd(node, state.doc);
          } else if (Object.hasOwn(InlineMarker, node.name)) {
            // Look for inline styles that partially overlap the range.
            // Expand the range over them if they start directly outside, otherwise mark them for later.
            const sNode = node.node;
            if (node.from < from && node.to <= to) {
              if (sNode.firstChild!.to === from) {
                from = node.from;
              } else {
                cutStyles.push(sNode);
              }
            } else if (node.from >= from && node.to > to) {
              if (sNode.lastChild!.from === to) {
                to = node.to;
              } else {
                cutStyles.push(sNode);
              }
            }
          }
        },
      });

      if (okay === null) {
        // No textblock found around selection. Check if the rest of the line is empty.
        const line = state.doc.lineAt(from);
        okay = to <= line.to && !/\S/.test(line.text.slice(from - line.from));
      }
      if (!okay) {
        return { range };
      }

      const changes: ChangeSpec[] = [];
      // Some changes must be moved to end of change array so that they are applied in the right order.
      const changesAfter: ChangeSpec[] = [];
      // Clear existing links.
      removeLinkInner(from, to, changesAfter, state);
      let cursorOffset = 1;
      // Close and reopen inline styles that partially overlap the range.
      for (const style of cutStyles) {
        const type = InlineMarker[style.name];
        const mark = inlineMarkerText(type);
        if (style.from < from) {
          // Extends before.
          changes.push({ from: skipSpaces(from, state.doc, -1), insert: mark });
          changesAfter.push({ from: skipSpaces(from, state.doc, 1, to), insert: mark });
        } else {
          changes.push({ from: skipSpaces(to, state.doc, -1, from), insert: mark });
          const after = skipSpaces(to, state.doc, 1);
          if (after === to) {
            cursorOffset += mark.length;
          }
          changesAfter.push({ from: after, insert: mark });
        }
      }

      // Add the link markup.
      changes.push({ from, insert: image ? '![' : '[' }, { from: to, insert: `](${url ?? ''})` });
      const changeSet = state.changes(changes.concat(changesAfter));
      // Put the cursor between the title or parenthesis.
      return {
        changes: changeSet,
        range: EditorSelection.cursor(changeSet.mapPos(to, 1) - cursorOffset - (url ? url.length + 2 : 0)),
      };
    });

    if (changes.changes.empty) {
      return false;
    }

    dispatch(
      state.update(changes, {
        userEvent: 'format.link.add',
        scrollIntoView: true,
      }),
    );
    return true;
  };
};

//
// Lists
//

export const addList = (type: List): StateCommand => {
  return ({ state, dispatch }) => {
    let lastBlock = -1;
    let counter = 1;
    let first = true;
    let parentColumn: number | null = null;

    // Scan the syntax tree to locate textblocks that can be wrapped.
    const blocks: { node: SyntaxNode; counter: number; parentColumn: number | null }[] = [];
    for (const { from, to } of state.selection.ranges) {
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          if ((Object.hasOwn(Textblocks, node.name) && node.name !== 'TableCell') || node.name === 'Table') {
            if (first) {
              // For the first block, see if it follows a list,
              // so we can take indentation and numbering information from that one.
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
          // When exiting block-level markup, reset the indentation and counter.
          if (node.name === 'BulletList' || node.name === 'OrderedList' || node.name === 'Blockquote') {
            counter = 1;
            parentColumn = null;
          }
        },
      });
    }

    if (!blocks.length) {
      // Insert a new list item if the selection is empty.
      const { from, to } = state.doc.lineAt(state.selection.main.anchor);
      if (from === to) {
        const insert = type === List.Bullet ? '- ' : type === List.Ordered ? '1. ' : '- [ ] ';
        dispatch(
          state.update({
            changes: [
              {
                from,
                insert,
              },
            ],
            selection: { anchor: from + insert.length },
            userEvent: 'format.list.add',
            scrollIntoView: true,
          }),
        );
        return true;
      }

      return false;
    }

    const changes: ChangeSpec[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const { node, counter, parentColumn } = blocks[i];
      const nodeFrom = node.name === 'CodeBlock' ? node.from - 4 : node.from;
      // Compute a padding based on whether we are after whitespace.
      let padding = nodeFrom > 0 && !/\s/.test(state.doc.sliceString(nodeFrom - 1, nodeFrom)) ? 1 : 0;
      // On ordered lists, the number is counted in the padding.
      if (type === List.Ordered) {
        padding += String(counter).length;
      }
      let line = state.doc.lineAt(nodeFrom);
      const column = nodeFrom - line.from;
      // Align to the list above if possible.
      if (parentColumn !== null && parentColumn > column) {
        padding = Math.max(padding, parentColumn - column);
      }

      let mark;
      if (type === List.Ordered) {
        // Scan ahead to find the max number we're adding, adjust padding for that.
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

      changes.push({ from: nodeFrom, insert: mark });
      // Add indentation for the other lines in this block.
      while (line.to < node.to) {
        line = state.doc.lineAt(line.to + 1);
        const open = /^[\s>]*/.exec(line.text)![0].length;
        changes.push({ from: line.from + Math.min(open, column), insert: ' '.repeat(mark.length) });
      }
    }

    // If we are inserting an ordered list and there is another one right after the last selected block,
    // renumber that one to match the new order.
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
    ('Oeswe');
    const changeSet = state.changes(changes);
    dispatch(
      state.update({
        changes: changeSet,
        selection: state.selection.map(changeSet, 1),
        userEvent: 'format.list.add',
        scrollIntoView: true,
      }),
    );
    return true;
  };
};

export const removeList = (type: List): StateCommand => {
  return ({ state, dispatch }) => {
    let lastBlock = -1;
    const changes: ChangeSpec[] = [];
    const stack: string[] = [];
    const targetNodeType = type === List.Ordered ? 'OrderedList' : type === List.Bullet ? 'BulletList' : 'TaskList';
    // Scan the syntax tree to locate list items that can be unwrapped.
    for (const { from, to } of state.selection.ranges) {
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          const { name } = node;
          if (name === 'BulletList' || name === 'OrderedList' || name === 'Blockquote') {
            // Maintain block context.
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
            // Delete the marker on the first line.
            changes.push({ from: node.from, to: node.from + mark[0].length });
            // and indentation on subsequent lines.
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

    dispatch(
      state.update({
        changes,
        userEvent: 'format.list.remove',
        scrollIntoView: true,
      }),
    );
    return true;
  };
};

export const toggleList = (type: List): StateCommand => {
  return (target) => {
    const formatting = getFormatting(target.state);
    const active =
      formatting.listStyle === (type === List.Bullet ? 'bullet' : type === List.Ordered ? 'ordered' : 'task');
    return (active ? removeList(type) : addList(type))(target);
  };
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

//
// Block quotes
//

export const setBlockquote = (enable: boolean): StateCommand => {
  return ({ state, dispatch }) => {
    const lines: Line[] = [];
    let lastBlock = -1;
    for (const { from, to } of state.selection.ranges) {
      const sawBlock = false;
      syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          if (Object.hasOwn(Textblocks, node.name) || node.name === 'Table') {
            if (node.from === lastBlock) {
              return false;
            }
            lastBlock = node.from;
            let line = state.doc.lineAt(node.from);
            if (line.number > 1) {
              const prevLine = state.doc.line(line.number - 1);
              if (/^[>\s]*$/.test(prevLine.text)) {
                if (!enable || (lines.length && lines[lines.length - 1].number === prevLine.number - 1)) {
                  lines.push(prevLine);
                }
              }
            }
            for (;;) {
              lines.push(line);
              if (line.to >= node.to) {
                break;
              }
              line = state.doc.line(line.number + 1);
            }
            if (!enable && line.number < state.doc.lines) {
              const nextLine = state.doc.line(line.number + 1);
              if (/^[>\s]*$/.test(nextLine.text)) {
                lines.push(nextLine);
              }
            }
            return false;
          }
        },
      });
      let line;
      if (!sawBlock && enable && from === to && !/\S/.test((line = state.doc.lineAt(from)).text)) {
        lines.push(line);
      }
    }

    const changes: ChangeSpec[] = [];
    for (const line of lines) {
      if (enable) {
        changes.push({ from: line.from, insert: /\S/.test(line.text) ? '> ' : '>' });
      } else {
        const quote = /((?:[\s>\-+*]|\d+[.)])*?)> ?/.exec(line.text);
        if (quote) {
          changes.push({ from: line.from + quote[1].length, to: line.from + quote[0].length });
        }
      }
    }
    if (!changes.length) {
      return false;
    }

    const changeSet = state.changes(changes);
    dispatch(
      state.update({
        changes: changeSet,
        selection: state.selection.map(changeSet, 1),
        userEvent: enable ? 'format.blockquote.add' : 'format.blockquote.remove',
        scrollIntoView: true,
      }),
    );
    return true;
  };
};

export const addBlockquote = setBlockquote(true);

export const removeBlockquote = setBlockquote(false);

export const toggleBlockquote: StateCommand = (target) => {
  return (getFormatting(target.state).blockQuote ? removeBlockquote : addBlockquote)(target);
};

//
// Code block
//

export const addCodeblock: StateCommand = (target) => {
  const { state, dispatch } = target;
  const { selection } = state;
  // If on a blank line, use the code block snippet.
  if (selection.ranges.length === 1 && selection.main.empty) {
    const { head } = selection.main;
    const line = state.doc.lineAt(head);
    if (!/\S/.test(line.text) && head === line.from) {
      snippets.codeblock(target, null, line.from, line.to);
      return true;
    }
  }

  // Otherwise, wrap any selected blocks in triple backticks.
  const ranges: { from: number; to: number }[] = [];
  for (const { from, to } of selection.ranges) {
    let blockFrom = from;
    let blockTo = to;
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (Object.hasOwn(Textblocks, node.name)) {
          if (from >= node.from && to <= node.to) {
            // Selection in a single block.
            blockFrom = node.from;
            blockTo = node.to;
          } else {
            // Expand to cover whole lines.
            blockFrom = Math.min(blockFrom, state.doc.lineAt(node.from).from);
            blockTo = Math.max(blockTo, state.doc.lineAt(node.to).to);
          }
        }
      },
    });
    if (ranges.length && ranges[ranges.length - 1].to >= blockFrom - 1) {
      ranges[ranges.length - 1].to = blockTo;
    } else {
      ranges.push({ from: blockFrom, to: blockTo });
    }
  }
  if (!ranges.length) {
    return false;
  }

  const changes: ChangeSpec[] = ranges.map(({ from, to }) => {
    const column = from - state.doc.lineAt(from).from;
    return [
      { from, insert: '```\n' + ' '.repeat(column) },
      { from: to, insert: '\n' + ' '.repeat(column) + '```' },
    ];
  });

  dispatch(
    state.update({
      changes,
      userEvent: 'format.codeblock.add',
      scrollIntoView: true,
    }),
  );

  return true;
};

export const removeCodeblock: StateCommand = ({ state, dispatch }) => {
  let lastBlock = -1;

  // Find all code blocks, remove their markup.
  const changes: ChangeSpec[] = [];
  for (const { from, to } of state.selection.ranges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (Textblocks[node.name] === 'codeblock' && lastBlock !== node.from) {
          lastBlock = node.from;
          const firstLine = state.doc.lineAt(node.from);
          if (node.name === 'FencedCode') {
            changes.push({ from: node.from, to: firstLine.to + 1 + node.from - firstLine.from });
            const lastLine = state.doc.lineAt(node.to);
            if (/^([\s>]|[-*+] |\d+[).])*`+$/.test(lastLine.text)) {
              changes.push({
                from: lastLine.from - (lastLine.number === firstLine.number + 1 ? 0 : 1),
                to: lastLine.to,
              });
            }
          } else {
            // Indented code block.
            const column = node.from - firstLine.from;
            for (let line = firstLine; ; line = state.doc.line(line.number + 1)) {
              changes.push({ from: line.from + column - 4, to: line.from + column });
              if (line.to >= node.to) {
                break;
              }
            }
          }
        }
      },
    });
  }
  if (!changes.length) {
    return false;
  }

  dispatch(state.update({ changes, userEvent: 'format.codeblock.remove', scrollIntoView: true }));
  return true;
};

export const toggleCodeblock: StateCommand = (target) => {
  return (getFormatting(target.state).blockType === 'codeblock' ? removeCodeblock : addCodeblock)(target);
};

//
// Formatting extension.
//

export type FormattingOptions = {};

export const formattingKeymap = (options: FormattingOptions = {}): Extension => {
  return [
    keymap.of([
      {
        key: 'meta-b',
        run: toggleStrong,
      },
      {
        key: 'meta-i',
        run: toggleEmphasis,
      },
    ]),
  ];
};

const InlineMarker: { [name: string]: number } = {
  Emphasis: Inline.Emphasis,
  StrongEmphasis: Inline.Strong,
  InlineCode: Inline.Code,
  Strikethrough: Inline.Strikethrough,
};

const IgnoreInline = new Set([
  'Autolink',
  'CodeMark',
  'CodeText',
  'Comment',
  'EmphasisMark',
  'Hardbreak',
  'HeaderMark',
  'HTMLTag',
  'LinkMark',
  'ListMark',
  'ProcessingInstruction',
  'QuoteMark',
  'StrikethroughMark',
  'SubscriptMark',
  'SuperscriptMark',
  'TaskMarker',
]);

const Textblocks: { [name: string]: NonNullable<Formatting['blockType']> } = {
  ATXHeading1: 'heading1',
  ATXHeading2: 'heading2',
  ATXHeading3: 'heading3',
  ATXHeading4: 'heading4',
  ATXHeading5: 'heading5',
  ATXHeading6: 'heading6',
  CodeBlock: 'codeblock',
  FencedCode: 'codeblock',
  Paragraph: 'paragraph',
  SetextHeading1: 'heading1',
  SetextHeading2: 'heading2',
  TableCell: 'tablecell',
  Task: 'paragraph',
};

/**
 * Query the editor state for the active formatting at the selection.
 */
export const getFormatting = (state: EditorState): Formatting => {
  // These will track the formatting we've seen so far.
  // False indicates mixed block types.
  let blockType: Formatting['blockType'] | false = null;
  // Indexed by the Inline enum, tracks inline markup.
  // null = no text seen, true = all text had the mark, false = saw text without it.
  const inline: (boolean | null)[] = [null, null, null, null];
  let link: boolean = false;
  let blockQuote: boolean | null = null;
  // False indicates mixed list styles.
  let listStyle: Formatting['listStyle'] | null | false = null;

  // Track block context for list/blockquote handling.
  const stack: ('BulletList' | 'OrderedList' | 'Blockquote' | 'TaskList')[] = [];
  // This is set when entering a textblock (paragraph, heading, etc.)
  // and cleared when exiting again. It is used to track inline style.
  // `active` holds an array that indicates, for the various style (`Inline` enum) whether they are currently active.
  let currentBlock: { pos: number; end: number; active: boolean[] } | null = null;
  // Advance over regular inline text. Will update `inline` depending on what styles are active.
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

  // Skip markup that shouldn't be treated as inline text for style-tracking purposes.
  const skipInline = (upto: number) => {
    if (currentBlock && upto > currentBlock.pos) {
      currentBlock.pos = Math.min(upto, currentBlock.end);
    }
  };

  const { selection } = state;
  for (const range of selection.ranges) {
    if (range.empty && inline.some((v) => v === null)) {
      // Check for markers directly around the cursor (which, not being valid Markdown, the syntax tree won't pick up).
      const contextSize = Math.min(range.head, 6);
      const contextBefore = state.doc.sliceString(range.head - contextSize, range.head);
      let contextAfter = state.doc.sliceString(range.head, range.head + contextSize);
      for (let i = 0; i < contextSize; i++) {
        const ch = contextAfter[i];
        if (ch !== contextBefore[contextBefore.length - 1 - i] || !/[~`*]/.test(ch)) {
          contextAfter = contextAfter.slice(0, i);
          break;
        }
      }
      for (let i = 0; i < inline.length; i++) {
        const mark = inlineMarkerText(i);
        const found = contextAfter.indexOf(mark);
        if (found > -1) {
          contextAfter = contextAfter.slice(0, found) + contextAfter.slice(found + mark.length);
          if (inline[i] === null) {
            inline[i] = true;
          }
        }
      }
    }

    syntaxTree(state).iterate({
      from: range.from,
      to: range.to,
      enter: (node) => {
        advanceInline(node.from);
        const { name } = node;
        if (name === 'BulletList' || name === 'OrderedList' || name === 'Blockquote') {
          // Maintain block context.
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
            // Set up inline content tracking for non-code textblocks.
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
          // Track block context.
          stack.pop();
        } else if (Object.hasOwn(Textblocks, name)) {
          // Scan the stack for blockquote/list context.
          // Done at end of node because task lists aren't recognized until a task is seen
          let hasList: Formatting['listStyle'] | false = false;
          let hasQuote = false;
          for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i] === 'Blockquote') {
              hasQuote = true;
            } else if (!hasList) {
              hasList = stack[i] === 'TaskList' ? 'task' : stack[i] === 'BulletList' ? 'bullet' : 'ordered';
            }
          }
          if (blockQuote === null) {
            blockQuote = hasQuote;
          } else if (!hasQuote && blockQuote) {
            blockQuote = false;
          }
          if (listStyle === null) {
            listStyle = hasList;
          } else if (listStyle !== hasList) {
            listStyle = false;
          }

          // End textblock.
          currentBlock = null;
        } else if (Object.hasOwn(InlineMarker, name) && currentBlock) {
          // Track markup in textblock.
          currentBlock.active[InlineMarker[name]] = false;
        }
      },
    });
  }

  const { from, to } = state.doc.lineAt(selection.main.anchor);
  const blankLine = from === to;

  return {
    blankLine,
    blockType: blockType || null,
    blockQuote: blockQuote ?? false,
    code: inline[Inline.Code] ?? false,
    emphasis: inline[Inline.Emphasis] ?? false,
    strong: inline[Inline.Strong] ?? false,
    strikethrough: inline[Inline.Strikethrough] ?? false,
    link,
    listStyle: listStyle || null,
  };
};

/**
 * Hook provides an extension to compute the current formatting state.
 */
export const useFormattingState = (): [Formatting | undefined, Extension] => {
  const [state, setState] = useState<Formatting>();

  const observer = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
          setState((prevState) => {
            const newState = getFormatting(update.state);
            if (!prevState || !formattingEquals(prevState, newState)) {
              return newState;
            }
            return prevState;
          });
        }
      }),
    [setState],
  );

  return [state, observer];
};
