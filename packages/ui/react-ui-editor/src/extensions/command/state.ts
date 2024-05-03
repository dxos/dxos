//
// Copyright 2024 DXOS.org
//

import { Facet, StateEffect, StateField } from '@codemirror/state';
import {
  type Command,
  type EditorView,
  type KeyBinding,
  showTooltip,
  type Tooltip,
  type TooltipView,
} from '@codemirror/view';

import { type CommandOptions } from './command';

type CommandState = {
  tooltip?: Tooltip | null;
};

export const commandConfig = Facet.define<CommandOptions, Required<CommandOptions>>({
  combine: (providers) => providers[0],
});

export const commandState = StateField.define<CommandState>({
  create: () => ({}),
  update: (state, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(closeEffect)) {
        return {};
      }

      if (effect.is(openEffect)) {
        const options = tr.state.facet(commandConfig);
        const { pos, fullWidth } = effect.value;
        const tooltip: Tooltip = {
          pos,
          above: false,
          arrow: false,
          strictSide: true,
          create: (view: EditorView) => {
            const dom = document.createElement('div');
            const tooltipView: TooltipView = {
              dom,
              mount: (view: EditorView) => {
                if (fullWidth) {
                  const parent = dom.parentElement!;
                  const { paddingLeft, paddingRight } = window.getComputedStyle(parent);
                  const widthWithoutPadding = parent.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
                  dom.style.width = `${widthWithoutPadding}px`;
                }

                // Render react component.
                options.onRender(dom, (action) => {
                  view.dispatch({ effects: closeEffect.of(null) });
                  if (action?.insert?.length) {
                    view.dispatch({
                      changes: { from: pos, insert: action.insert },
                      selection: { anchor: pos + action.insert.length },
                    });
                  }
                  // NOTE: Truncates text if set focus immediately.
                  requestAnimationFrame(() => view.focus());
                });
              },
            };

            return tooltipView;
          },
        };
        return { tooltip };
      }
    }

    return state;
  },
  provide: (field) => [showTooltip.from(field, (value) => value.tooltip ?? null)],
});

export const openEffect = StateEffect.define<{ pos: number; fullWidth?: boolean }>();
export const closeEffect = StateEffect.define<null>();

export const openCommand: Command = (view: EditorView) => {
  if (view.state.field(commandState, false)) {
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.from);
    if (line.from === selection.from && line.from === line.to) {
      view.dispatch({ effects: openEffect.of({ pos: selection.anchor, fullWidth: true }) });
      return true;
    }
  }
  return false;
};

export const closeCommand: Command = (view: EditorView) => {
  if (view.state.field(commandState, false)) {
    view.dispatch({ effects: closeEffect.of(null) });
    return true;
  }
  return false;
};

export const commandKeyBindings: readonly KeyBinding[] = [
  { key: '/', run: openCommand },
  { key: 'Escape', run: closeCommand },
];
