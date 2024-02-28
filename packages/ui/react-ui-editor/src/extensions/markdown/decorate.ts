//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, WidgetType, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { mx } from '@dxos/react-ui-theme';

import { getToken } from '../../styles';

class HorizontalRuleWidget extends WidgetType {
  override toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-hr';
    return el;
  }
}

class LinkButton extends WidgetType {
  constructor(
    private readonly url: string,
    private readonly render: (el: Element, url: string) => void,
  ) {
    super();
  }

  override eq(other: this) {
    return this.url === other.url;
  }

  override toDOM(view: EditorView) {
    const el = document.createElement('span');
    this.render(el, this.url);
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

  override toDOM(view: EditorView) {
    const input = document.createElement('input');
    input.className = 'cm-task-checkbox';
    input.type = 'checkbox';
    input.checked = this._checked;
    if (view.state.readOnly) {
      input.setAttribute('disabled', 'true');
    } else {
      input.onmousedown = (event: Event) => {
        const pos = view.posAtDOM(input);
        const text = view.state.sliceDoc(pos, pos + 3);
        if (text === (this._checked ? '[x]' : '[ ]')) {
          view.dispatch({
            changes: { from: pos + 1, to: pos + 2, insert: this._checked ? ' ' : 'x' },
          });
          event.preventDefault();
        }
      };
    }
    return input;
  }

  override ignoreEvent() {
    return false;
  }
}

const hide = Decoration.replace({});
const fencedCodeLine = Decoration.line({ class: mx('cm-code cm-codeblock-line') });
const fencedCodeLineFirst = Decoration.line({ class: mx('cm-code cm-codeblock-line', 'cm-codeblock-first') });
const fencedCodeLineLast = Decoration.line({ class: mx('cm-code cm-codeblock-line', 'cm-codeblock-last') });
const horizontalRule = Decoration.replace({ widget: new HorizontalRuleWidget() });
const checkedTask = Decoration.replace({ widget: new CheckboxWidget(true) });
const uncheckedTask = Decoration.replace({ widget: new CheckboxWidget(false) });

const editingRange = (state: EditorState, range: { from: number; to: number }, lineChanged?: boolean): boolean => {
  if (lineChanged) {
    return false;
  }
  const {
    readOnly,
    selection: {
      main: { head },
    },
  } = state;
  return !readOnly && head >= range.from && head <= range.to;
};

const MarksByParent = new Set(['CodeMark', 'EmphasisMark', 'StrikethroughMark', 'SubscriptMark', 'SuperscriptMark']);

const buildDecorations = (view: EditorView, options: DecorateOptions, lineChanged?: boolean): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'FencedCode') {
          const editing = editingRange(state, node);
          // FencedCode > CodeMark > [CodeInfo] > CodeText > CodeMark
          for (const block of view.viewportLineBlocks) {
            if (block.to < node.from) {
              continue;
            }
            if (block.from > node.to) {
              break;
            }
            const first = block.from <= node.from;
            const last = block.to >= node.to;
            builder.add(
              block.from,
              block.from,
              first ? fencedCodeLineFirst : last ? fencedCodeLineLast : fencedCodeLine,
            );
            if (!editing && (first || last)) {
              builder.add(block.from, block.to, hide);
            }
          }
          return false;
        } else if (node.name === 'Link') {
          const marks = node.node.getChildren('LinkMark');
          const urlNode = node.node.getChild('URL');
          const editing = editingRange(state, node, lineChanged);
          if (urlNode && marks.length >= 2) {
            const url = state.sliceDoc(urlNode.from, urlNode.to);
            if (!editing) {
              builder.add(node.from, marks[0].to, hide);
            }
            builder.add(
              marks[0].to,
              marks[1].from,
              Decoration.mark({
                tagName: 'a',
                attributes: {
                  class: 'cm-link',
                  href: url,
                  rel: 'noreferrer',
                  target: '_blank',
                },
              }),
            );
            if (!editing) {
              builder.add(
                marks[1].from,
                node.to,
                options.renderLinkButton
                  ? Decoration.replace({
                      widget: new LinkButton(url, options.renderLinkButton),
                    })
                  : hide,
              );
            }
          }
        } else if (node.name === 'HeaderMark') {
          const parent = node.node.parent!;
          if (/^ATX/.test(parent.name) && !editingRange(state, state.doc.lineAt(node.from), lineChanged)) {
            const next = state.doc.sliceString(node.to, node.to + 1);
            builder.add(node.from, node.to + (next === ' ' ? 1 : 0), hide);
          }
        } else if (node.name === 'HorizontalRule') {
          if (!editingRange(state, node, lineChanged)) {
            builder.add(node.from, node.to, horizontalRule);
          }
        } else if (node.name === 'TaskMarker') {
          // Check if cursor is inside text.
          if (!editingRange(state, node, lineChanged)) {
            const checked = state.doc.sliceString(node.from + 1, node.to - 1) === 'x';
            builder.add(node.from - 2, node.from - 1, Decoration.mark({ class: 'cm-task' }));
            builder.add(node.from, node.to, checked ? checkedTask : uncheckedTask);
          }
        } else if (MarksByParent.has(node.name)) {
          if (!editingRange(state, node.node.parent!, lineChanged)) {
            builder.add(node.from, node.to, hide);
          }
        }
      },
    });
  }

  return builder.finish();
};

export interface DecorateOptions {
  renderLinkButton?: (el: Element, url: string) => void;
}

export const decorateMarkdown = (options: DecorateOptions = {}) => {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = buildDecorations(view, options);
        }

        update(update: ViewUpdate) {
          const { number: previous } = update.state.doc.lineAt(update.startState.selection.main.anchor);
          const { number: current } = update.state.doc.lineAt(update.state.selection.main.anchor);
          // TODO(burdon): Updated is called twice when navigating via keys.
          const lineChanged = previous !== current;
          if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.decorations = buildDecorations(update.view, options, lineChanged);
          }
        }
      },
      {
        decorations: (value) => value.decorations,
      },
    ),
    formattingStyles,
  ];
};

const formattingStyles = EditorView.baseTheme({
  '& .cm-code': {
    fontFamily: getToken('fontFamily.mono', []).join(','),
  },
  '& .cm-codeblock-line': {
    paddingInline: '1rem !important',
  },

  '& .cm-codeblock-end': {
    display: 'inline-block',
    width: '100%',
    position: 'relative',
    '&::after': {
      position: 'absolute',
      inset: 0,
      content: '""',
    },
  },
  '& .cm-codeblock-first': {
    borderTopLeftRadius: '.5rem',
    borderTopRightRadius: '.5rem',
  },
  '& .cm-codeblock-last': {
    borderBottomLeftRadius: '.5rem',
    borderBottomRightRadius: '.5rem',
  },
  '&light .cm-codeblock-line, &light .cm-activeLine.cm-codeblock-line': {
    background: getToken('extend.semanticColors.input.light'),
    mixBlendMode: 'darken',
  },
  '&dark .cm-codeblock-line, &dark .cm-activeLine.cm-codeblock-line': {
    background: getToken('extend.semanticColors.input.dark'),
    mixBlendMode: 'lighten',
  },
  '& .cm-hr': {
    display: 'inline-block',
    width: '100%',
    height: '0',
    verticalAlign: 'middle',
    borderTop: `1px solid ${getToken('extend.colors.neutral.200')}`,
  },
  '& .cm-task': {
    color: getToken('extend.colors.blue.500'),
  },
  '& .cm-task-checkbox': {
    marginLeft: '4px',
    marginRight: '4px',
  },
});
