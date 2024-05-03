//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type EditorState, StateEffect } from '@codemirror/state';
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
    input.className = 'cm-task-checkbox ch-checkbox ch-focus-ring -mbs-0.5';
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

// Check if cursor is inside text.
const editingRange = (state: EditorState, range: { from: number; to: number }, focus: boolean) => {
  const {
    readOnly,
    selection: {
      main: { head },
    },
  } = state;
  return focus && !readOnly && head >= range.from && head <= range.to;
};

const MarksByParent = new Set(['CodeMark', 'EmphasisMark', 'StrikethroughMark', 'SubscriptMark', 'SuperscriptMark']);

const buildDecorations = (view: EditorView, options: DecorateOptions, focus: boolean) => {
  const deco = new RangeSetBuilder<Decoration>();
  const atomicDeco = new RangeSetBuilder<Decoration>();
  const { state } = view;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        switch (node.name) {
          // FencedCode > CodeMark > [CodeInfo] > CodeText > CodeMark
          case 'FencedCode': {
            const editing = editingRange(state, node, focus);
            for (const block of view.viewportLineBlocks) {
              if (block.to < node.from) {
                continue;
              }
              if (block.from > node.to) {
                break;
              }
              const first = block.from <= node.from;
              const last = block.to >= node.to && /^(\s>)*```$/.test(state.doc.sliceString(block.from, block.to));
              deco.add(
                block.from,
                block.from,
                first ? fencedCodeLineFirst : last ? fencedCodeLineLast : fencedCodeLine,
              );
              if (!editing && (first || last)) {
                atomicDeco.add(block.from, block.to, hide);
              }
            }
            return false;
          }

          case 'Link': {
            const marks = node.node.getChildren('LinkMark');
            const urlNode = node.node.getChild('URL');
            const editing = editingRange(state, node, focus);
            if (urlNode && marks.length >= 2) {
              const url = state.sliceDoc(urlNode.from, urlNode.to);
              if (!editing) {
                atomicDeco.add(node.from, marks[0].to, hide);
              }
              deco.add(
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
                atomicDeco.add(
                  marks[1].from,
                  node.to,
                  options.renderLinkButton
                    ? Decoration.replace({ widget: new LinkButton(url, options.renderLinkButton) })
                    : hide,
                );
              }
            }
            break;
          }

          case 'HeaderMark': {
            const parent = node.node.parent!;
            if (/^ATX/.test(parent.name) && !editingRange(state, state.doc.lineAt(node.from), focus)) {
              const next = state.doc.sliceString(node.to, node.to + 1);
              atomicDeco.add(node.from, node.to + (next === ' ' ? 1 : 0), hide);
            }
            break;
          }

          case 'HorizontalRule': {
            if (!editingRange(state, node, focus)) {
              deco.add(node.from, node.to, horizontalRule);
            }
            break;
          }

          case 'TaskMarker': {
            if (!editingRange(state, node, focus)) {
              const checked = state.doc.sliceString(node.from + 1, node.to - 1) === 'x';
              atomicDeco.add(node.from - 2, node.from - 1, Decoration.mark({ class: 'cm-task' }));
              atomicDeco.add(node.from, node.to, checked ? checkedTask : uncheckedTask);
            }
            break;
          }

          case 'ListItem': {
            const start = state.doc.lineAt(node.from);
            deco.add(start.from, start.from, Decoration.line({ class: 'cm-list-item' }));
            break;
          }

          default: {
            if (MarksByParent.has(node.name)) {
              if (!editingRange(state, node.node.parent!, focus)) {
                atomicDeco.add(node.from, node.to, hide);
              }
            }
          }
        }
      },
    });
  }

  return { deco: deco.finish(), atomicDeco: atomicDeco.finish() };
};

export interface DecorateOptions {
  renderLinkButton?: (el: Element, url: string) => void;
  /**
   * Prevents triggering decorations as the cursor moves through the document.
   */
  selectionChangeDelay?: number;
}

const forceUpdate = StateEffect.define<null>();

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
            update.transactions.some((tr) => tr.effects.some((e) => e.is(forceUpdate))) ||
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
          EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomicDeco ?? Decoration.none),
          EditorView.decorations.of((view) => view.plugin(plugin)?.atomicDeco ?? Decoration.none),
          EditorView.decorations.of((view) => view.plugin(plugin)?.deco ?? Decoration.none),
        ],
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

  // '& .cm-list-item > span:nth-child(2)': {},
});
