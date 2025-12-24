//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, Prec, RangeSetBuilder, StateEffect } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/ui-theme';

import { type HeadingLevel, markdownTheme } from '../../styles';
import { type RenderCallback } from '../../types';
import { wrapWithCatch } from '../../util';

import { adjustChanges } from './changes';
import { image } from './image';
import { bulletListIndentationWidth, formattingStyles, orderedListIndentationWidth } from './styles';
import { table } from './table';

/**
 * Unicode characters.
 * NOTE: Depends on font.
 * https://www.compart.com/en/unicode (nice resource).
 * https://en.wikipedia.org/wiki/List_of_Unicode_characters
 */
const Unicode = {
  emDash: '\u2014',
  bullet: '\u2022',
  bulletSmall: '\u2219',
  bulletSquare: '\u2b1d',
};

//
// Widgets
//

class HorizontalRuleWidget extends WidgetType {
  override toDOM(): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'cm-hr';
    return el;
  }
}

class LinkButton extends WidgetType {
  constructor(
    private readonly url: string,
    private readonly render: RenderCallback<{ url: string }>,
  ) {
    super();
  }

  override eq(other: this) {
    return this.url === other.url;
  }

  // TODO(burdon): Create icon and link directly without react?
  override toDOM(view: EditorView) {
    const el = document.createElement('span');
    this.render(el, { url: this.url }, view);
    return el;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(private _checked: boolean) {
    super();
  }

  override eq(other: this) {
    return this._checked === other._checked;
  }

  override ignoreEvent() {
    return false;
  }

  override toDOM(view: EditorView) {
    const input = document.createElement('input');
    input.className = 'cm-task-checkbox dx-checkbox';
    input.type = 'checkbox';
    input.tabIndex = -1;
    input.checked = this._checked;
    if (view.state.readOnly) {
      input.setAttribute('disabled', 'true');
    } else {
      input.onmousedown = (event: Event) => {
        // Could be beginning of line.
        const line = view.state.doc.lineAt(view.posAtDOM(span));
        const text = view.state.sliceDoc(line.from, line.to);
        const match = text.match(/^\s*- (\[[xX ]]).*/);
        if (match) {
          const [, checked] = match;
          const pos = line.from + text.indexOf(checked);
          this._checked = checked !== '[ ]';
          view.dispatch({
            changes: { from: pos + 1, to: pos + 2, insert: this._checked ? ' ' : 'x' },
          });

          event.preventDefault();
        }
      };
    }

    const span = document.createElement('span');
    span.className = 'cm-task';
    span.appendChild(input);
    return span;
  }
}

class TextWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly className?: string,
  ) {
    super();
  }

  override toDOM(): HTMLSpanElement {
    const el = document.createElement('span');
    if (this.className) {
      el.className = this.className;
    }
    el.innerText = this.text;
    return el;
  }
}

const hide = Decoration.replace({});
const blockQuote = Decoration.line({ class: 'cm-blockquote' });
const fencedCodeLine = Decoration.line({ class: 'cm-code cm-codeblock-line' });
const fencedCodeLineFirst = Decoration.line({ class: mx('cm-code cm-codeblock-line', 'cm-codeblock-start') });
const fencedCodeLineLast = Decoration.line({ class: mx('cm-code cm-codeblock-line', 'cm-codeblock-end') });
const commentBlockLine = fencedCodeLine;
const commentBlockLineFirst = fencedCodeLineFirst;
const commentBlockLineLast = fencedCodeLineLast;
const horizontalRule = Decoration.replace({ widget: new HorizontalRuleWidget() });
const checkedTask = Decoration.replace({ widget: new CheckboxWidget(true) });
const uncheckedTask = Decoration.replace({ widget: new CheckboxWidget(false) });

/**
 * Checks if cursor is inside text.
 */
const editingRange = (state: EditorState, range: { from: number; to: number }, focus: boolean) => {
  const {
    readOnly,
    selection: {
      main: { head },
    },
  } = state;
  return focus && !readOnly && head >= range.from && head <= range.to;
};

const autoHideTags = new Set([
  'CodeMark',
  'CodeInfo',
  'EmphasisMark',
  'StrikethroughMark',
  'SubscriptMark',
  'SuperscriptMark',
]);

/**
 * Markdown list level.
 */
type NumberingLevel = { type: string; from: number; to: number; level: number; number: number };

const buildDecorations = (view: EditorView, options: DecorateOptions, focus: boolean) => {
  const decoRanges: { from: number; to: number; deco: Decoration }[] = [];
  const atomicDecoRanges: { from: number; to: number; deco: Decoration }[] = [];
  const { state } = view;

  // Header numbering.
  // TODO(burdon): Pre-parse headers to allow virtualization.
  const headerLevels: (NumberingLevel | null)[] = [];
  const getHeaderLevels = (node: SyntaxNodeRef, level: number): (NumberingLevel | null)[] => {
    invariant(level > 0);
    if (level > headerLevels.length) {
      const len = headerLevels.length;
      headerLevels.length = level;
      headerLevels.fill(null, len);
      headerLevels[level - 1] = { type: node.name, from: node.from, to: node.to, level, number: 0 };
    } else {
      headerLevels.splice(level);
    }

    return headerLevels.slice(0, level);
  };

  // List numbering and indentation.
  const listLevels: NumberingLevel[] = [];
  const enterList = (node: SyntaxNodeRef) => {
    listLevels.push({ type: node.name, from: node.from, to: node.to, level: listLevels.length, number: 0 });
  };
  const leaveList = () => {
    listLevels.pop();
  };
  const getCurrentListLevel = (): NumberingLevel => {
    invariant(listLevels.length);
    return listLevels[listLevels.length - 1];
  };

  // let count = 0;
  const enterNode = (node: SyntaxNodeRef) => {
    // console.log(`[${count++}]`, { node: node.name, from: node.from, to: node.to });
    switch (node.name) {
      // ATXHeading > HeaderMark > Paragraph
      // NOTE: Numbering requires processing the entire document since otherwise only the visible range will be
      // processed and the numbering will be incorrect.
      case 'ATXHeading1':
      case 'ATXHeading2':
      case 'ATXHeading3':
      case 'ATXHeading4':
      case 'ATXHeading5':
      case 'ATXHeading6': {
        const level = parseInt(node.name['ATXHeading'.length]) as HeadingLevel;
        const headers = getHeaderLevels(node, level);
        if (options.numberedHeadings?.from !== undefined) {
          const header = headers[level - 1];
          // TODO(burdon): Header will be missing if headers are out of order (e.g., ## header then # header).
          if (header) {
            header.number++;
          }
        }

        const editing = editingRange(state, node, focus);
        if (editing) {
          break;
        }

        const mark = node.node.firstChild!;
        if (mark?.name === 'HeaderMark') {
          const { from, to = 6 } = options.numberedHeadings ?? {};
          const text = state.sliceDoc(node.from, node.to);
          const len = text.match(/[#\s]+/)![0].length;
          if (!from || level < from || level > to) {
            atomicDecoRanges.push({ from: mark.from, to: mark.from + len, deco: hide });
          } else {
            // TODO(burdon): Number format/style.
            const num =
              headers
                .slice(from - 1)
                .map((level) => level?.number ?? 0)
                .join('.') + ' ';

            if (num.length) {
              atomicDecoRanges.push({
                from: mark.from,
                to: mark.from + len,
                deco: Decoration.replace({
                  widget: new TextWidget(num, markdownTheme.heading(level)),
                }),
              });
            }
          }
        }

        return false;
      }

      //
      // Lists.
      // [BulletList | OrderedList] > (ListItem > ListMark) > (Task > TaskMarker)?
      //

      case 'BulletList':
      case 'OrderedList': {
        enterList(node);
        break;
      }

      case 'ListItem': {
        const line = state.doc.lineAt(node.from);

        // Set indentation.
        const list = getCurrentListLevel();
        const width = list.type === 'OrderedList' ? orderedListIndentationWidth : bulletListIndentationWidth;
        const offset = (options?.listPaddingLeft ?? 0) + ((list.level ?? 0) + 1) * width;
        if (node.from === line.to - 1) {
          // Abort if only the hyphen is typed.
          return false;
        }

        // Add line decoration for the continuation indent.
        // TODO(burdon): Bug if indentation is more than one indentation unit (e.g., 4 spaces) from the previous line.
        decoRanges.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({
            class: 'cm-list-item',
            attributes: {
              style: `padding-left: ${offset}px; text-indent: -${width}px;`,
            },
          }),
        });

        break;
      }

      case 'ListMark': {
        const list = getCurrentListLevel();

        // Look-ahead for task marker.
        // NOTE: Requires space to exist (otherwise the text is parsed as the start of a link).
        const next = tree.resolve(node.to + 1, 1);
        if (next?.name === 'TaskMarker') {
          break;
        }

        // TODO(burdon): Option to make hierarchical; or a), i), etc.
        const label = list.type === 'OrderedList' ? `${++list.number}.` : Unicode.bulletSmall;
        const line = state.doc.lineAt(node.from);
        const to = state.doc.sliceString(node.to, node.to + 1) === ' ' ? node.to + 1 : node.to;
        atomicDecoRanges.push({
          from: line.from,
          to,
          deco: Decoration.replace({
            widget: new TextWidget(
              label,
              list.type === 'OrderedList' ? 'cm-list-mark cm-list-mark-ordered' : 'cm-list-mark cm-list-mark-bullet',
            ),
          }),
        });
        break;
      }

      case 'TaskMarker': {
        const checked = state.doc.sliceString(node.from + 1, node.to - 1) === 'x';
        // Check if the next character is a space and if so, include it in the replacement.
        const line = state.doc.lineAt(node.from);
        const to = state.doc.sliceString(node.to, node.to + 1) === ' ' ? node.to + 1 : node.to;
        atomicDecoRanges.push({ from: line.from, to, deco: checked ? checkedTask : uncheckedTask });
        break;
      }

      //
      // Blockquote > QuoteMark > Paragraph
      //

      case 'Blockquote': {
        const editing = editingRange(state, node, focus);
        const quoteMark = node.node.getChild('QuoteMark');
        const paragraph = node.node.getChild('Paragraph');
        if (!editing && quoteMark && paragraph) {
          atomicDecoRanges.push({ from: quoteMark.from, to: paragraph.from, deco: hide });
        }

        for (const block of view.viewportLineBlocks) {
          if (block.to < node.from) {
            continue;
          }
          if (block.from > node.to) {
            break;
          }

          decoRanges.push({ from: block.from, to: block.from, deco: blockQuote });
        }

        break;
      }

      //
      // CommentBlock
      //

      case 'CommentBlock': {
        const editing = editingRange(state, node, focus);
        for (const block of view.viewportLineBlocks) {
          if (block.to < node.from) {
            continue;
          }
          if (block.from > node.to) {
            break;
          }

          const isFirst = block.from <= node.from;
          const isLast = block.to >= node.to && /^(\s>)*-->$/.test(state.doc.sliceString(block.from, block.to));

          decoRanges.push({
            from: block.from,
            to: block.from,
            deco: isFirst ? commentBlockLineFirst : isLast ? commentBlockLineLast : commentBlockLine,
          });

          if (!editing && (isFirst || isLast)) {
            atomicDecoRanges.push({ from: block.from, to: block.to, deco: hide });
          }
        }
        break;
      }

      //
      // FencedCode > CodeMark > [CodeInfo] > CodeText > CodeMark
      //

      case 'FencedCode': {
        for (const block of view.viewportLineBlocks) {
          if (block.to < node.from) {
            continue;
          }
          if (block.from > node.to) {
            break;
          }

          const first = block.from <= node.from;
          const last = block.to >= node.to && /```$/.test(state.doc.sliceString(block.from, block.to));
          decoRanges.push({
            from: block.from,
            to: block.from,
            deco: first ? fencedCodeLineFirst : last ? fencedCodeLineLast : fencedCodeLine,
          });

          const editing = editingRange(state, node, focus);
          if (!editing && (first || last)) {
            atomicDecoRanges.push({ from: block.from, to: block.to, deco: hide });
          }
        }
        return false;
      }

      //
      // Link > [LinkMark, URL]
      //

      case 'Link': {
        const marks = node.node.getChildren('LinkMark');
        const urlNode = node.node.getChild('URL');
        const editing = editingRange(state, node, focus);
        if (urlNode && marks.length >= 2) {
          const url = state.sliceDoc(urlNode.from, urlNode.to);
          if (options.skip?.({ name: 'Link', url })) {
            break;
          }
          if (!editing) {
            atomicDecoRanges.push({ from: node.from, to: marks[0].to, deco: hide });
          }

          decoRanges.push({
            from: marks[0].to,
            to: marks[1].from,
            deco: Decoration.mark({
              tagName: 'a',
              attributes: {
                class: 'cm-link',
                href: url,
                rel: 'noreferrer',
                target: '_blank',
              },
            }),
          });

          if (!editing) {
            atomicDecoRanges.push({
              from: marks[1].from,
              to: node.to,
              deco: options.renderLinkButton
                ? Decoration.replace({ widget: new LinkButton(url, options.renderLinkButton) })
                : hide,
            });
          }
        }
        break;
      }

      //
      // HR
      //

      case 'HorizontalRule': {
        if (!editingRange(state, node, focus)) {
          decoRanges.push({ from: node.from, to: node.to, deco: horizontalRule });
        }
        break;
      }

      default: {
        if (autoHideTags.has(node.name)) {
          if (!editingRange(state, node.node.parent!, focus)) {
            atomicDecoRanges.push({ from: node.from, to: node.to, deco: hide });
          }
        }
      }
    }
  };

  const leaveNode = (node: SyntaxNodeRef) => {
    switch (node.name) {
      case 'BulletList':
      case 'OrderedList': {
        leaveList();
        break;
      }
    }
  };

  const tree = syntaxTree(state);
  if (options.numberedHeadings?.from === undefined) {
    for (const { from, to } of view.visibleRanges) {
      tree.iterate({
        from,
        to,
        enter: wrapWithCatch(enterNode, 'decorate.enter'),
        leave: wrapWithCatch(leaveNode, 'decorate.leave'),
      });
    }
  } else {
    // NOTE: If line numbering then we must iterate from the start of document.
    tree.iterate({
      enter: wrapWithCatch(enterNode, 'decorate.enter'),
      leave: wrapWithCatch(leaveNode, 'decorate.leave'),
    });
  }

  // Sort and build decoration sets.
  const sortRanges = (a: { from: number; to: number }, b: { from: number; to: number }) =>
    a.from - b.from || a.to - b.to;

  decoRanges.sort(sortRanges);
  atomicDecoRanges.sort(sortRanges);

  const deco = new RangeSetBuilder<Decoration>();
  for (const { from, to, deco: d } of decoRanges) {
    deco.add(from, to, d);
  }

  const atomicDeco = new RangeSetBuilder<Decoration>();
  for (const { from, to, deco: d } of atomicDecoRanges) {
    atomicDeco.add(from, to, d);
  }

  return {
    deco: deco.finish(),
    atomicDeco: atomicDeco.finish(),
  };
};

const forceUpdate = StateEffect.define<null>();

export type NodeData = { name: 'Link'; url: string } | { name: 'Image'; url: string };

export interface DecorateOptions {
  /**
   * Prevents triggering decorations as the cursor moves through the document.
   */
  selectionChangeDelay?: number;
  numberedHeadings?: { from: number; to?: number };
  // TODO(burdon): Additional padding for each line.
  listPaddingLeft?: number;
  // TODO(burdon): Use consistently.
  skip?: (node: NodeData) => boolean;
  // TODO(burdon): Remove.
  renderLinkButton?: RenderCallback<{ url: string }>;
}

export const decorateMarkdown = (options: DecorateOptions = {}) => {
  return [
    ViewPlugin.fromClass(
      class {
        deco: DecorationSet;
        atomicDeco: DecorationSet;
        pendingUpdate?: NodeJS.Timeout;

        constructor(view: EditorView) {
          ({ deco: this.deco, atomicDeco: this.atomicDeco } = buildDecorations(view, options, view.hasFocus));
        }

        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.viewportChanged ||
            update.focusChanged ||
            update.transactions.some((tr) => tr.effects.some((effect) => effect.is(forceUpdate))) ||
            (update.selectionSet && !options.selectionChangeDelay)
          ) {
            ({ deco: this.deco, atomicDeco: this.atomicDeco } = buildDecorations(
              update.view,
              options,
              update.view.hasFocus,
            ));

            this.clearUpdate();
          } else if (update.selectionSet) {
            this.scheduleUpdate(update.view);
          }
        }

        // Defer update in case moving through the document.
        scheduleUpdate(view: EditorView) {
          this.clearUpdate();
          this.pendingUpdate = setTimeout(() => {
            view.dispatch({ effects: forceUpdate.of(null) });
          }, options.selectionChangeDelay);
        }

        clearUpdate() {
          if (this.pendingUpdate) {
            clearTimeout(this.pendingUpdate);
            this.pendingUpdate = undefined;
          }
        }

        destroy() {
          this.clearUpdate();
        }
      },
      {
        provide: (plugin) => [
          Prec.low(EditorView.decorations.of((view) => view.plugin(plugin)?.deco ?? Decoration.none)),
          EditorView.decorations.of((view) => view.plugin(plugin)?.atomicDeco ?? Decoration.none),
          EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomicDeco ?? Decoration.none),
        ],
      },
    ),
    image(),
    table(),
    adjustChanges(),
    formattingStyles,
  ];
};
