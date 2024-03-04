//
// Copyright 2024 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  showTooltip,
  type Tooltip,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import { clientRectsFor, flattenRect } from './util/dom';

// https://discuss.codemirror.net/t/inline-code-hints-like-vscode/5533/4
// https://github.com/saminzadeh/codemirror-extension-inline-suggestion
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/ui/components/text_editor/config.ts#L370

class Command extends WidgetType {
  constructor(readonly content: string | HTMLElement) {
    super();
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-placeholder';
    wrap.style.pointerEvents = 'none';
    wrap.appendChild(typeof this.content === 'string' ? document.createTextNode(this.content) : this.content);
    if (typeof this.content === 'string') {
      wrap.setAttribute('aria-label', 'placeholder ' + this.content);
    } else {
      wrap.setAttribute('aria-hidden', 'true');
    }
    return wrap;
  }

  override coordsAt(dom: HTMLElement) {
    const rects = dom.firstChild ? clientRectsFor(dom.firstChild) : [];
    if (!rects.length) {
      return null;
    }
    const style = window.getComputedStyle(dom.parentNode as HTMLElement);
    const rect = flattenRect(rects[0], style.direction != 'rtl');
    const lineHeight = parseInt(style.lineHeight);
    if (rect.bottom - rect.top > lineHeight * 1.5) {
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight };
    }
    return rect;
  }

  override ignoreEvent() {
    return false;
  }
}

const commandTooltipField = StateField.define<readonly Tooltip[]>({
  create: (state: EditorState) => getCursorTooltips(state),
  update: (tooltips, tr) => {
    if (!tr.docChanged && !tr.selection) {
      return tooltips;
    }

    return getCursorTooltips(tr.state);
  },

  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

// TODO(burdon): Only show on command.
// TODO(burdon): Text input/nav.
const getCursorTooltips = (state: EditorState): readonly Tooltip[] =>
  state.selection.ranges
    .filter((range) => range.empty)
    .map((range) => {
      const line = state.doc.lineAt(range.head);
      const text = line.number + ':' + (range.head - line.from);
      return {
        pos: range.head,
        above: false,
        strictSide: true,
        arrow: false,
        create: () => {
          const dom = document.createElement('div');
          dom.className = 'cm-tooltip-command';
          dom.textContent = text;
          return { dom };
        },
      };
    });

const commandTooltipBaseTheme = EditorView.baseTheme({
  '.cm-tooltip.cm-tooltip-command': {
    backgroundColor: '#66b',
    color: 'white',
    border: 'none',
    padding: '2px 7px',
    borderRadius: '4px',
    '& .cm-tooltip-arrow:before': {
      borderTopColor: '#66b',
    },
    '& .cm-tooltip-arrow:after': {
      borderTopColor: 'transparent',
    },
  },
});

export type CommandOptions = {
  onHint: () => string | undefined;
};

export const command = ({ onHint }: CommandOptions): Extension => {
  return [
    ViewPlugin.fromClass(
      class {
        deco = Decoration.none;
        update(update: ViewUpdate) {
          const builder = new RangeSetBuilder<Decoration>();
          const selection = update.view.state.selection.main;
          const line = update.view.state.doc.lineAt(selection.from);
          // Only show if blank line.
          // TODO(burdon): Show after delay or if blank line above.
          if (line.from === selection.from && line.from === line.to) {
            const hint = onHint();
            if (hint) {
              builder.add(selection.from, selection.to, Decoration.widget({ widget: new Command(hint) }));
            }
          }
          this.deco = builder.finish();
        }
      },
      {
        provide: (plugin) => [EditorView.decorations.of((view) => view.plugin(plugin)?.deco ?? Decoration.none)],
      },
    ),
    commandTooltipField,
    commandTooltipBaseTheme,
  ];
};
