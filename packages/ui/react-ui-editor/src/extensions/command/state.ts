//
// Copyright 2024 DXOS.org
//

import { StateField } from '@codemirror/state';
import { showTooltip, type EditorView, type Tooltip, type TooltipView } from '@codemirror/view';

import { closeEffect, type Action, openEffect } from './action';
import { type CommandOptions } from './command';
import { singleValueFacet } from '../../util';

export const commandConfig = singleValueFacet<CommandOptions>();

export type PopupOptions = {
  onRenderDialog: (el: HTMLElement, cb: (action?: Action) => void) => void;
};

type CommandState = {
  tooltip?: Tooltip | null;
};

export const commandState = StateField.define<CommandState>({
  create: () => ({}),
  update: (state, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(closeEffect)) {
        return {};
      }

      const { onRenderDialog } = tr.state.facet(commandConfig);
      if (effect.is(openEffect) && onRenderDialog) {
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
                onRenderDialog(dom, (action) => {
                  view.dispatch({ effects: closeEffect.of(null) });
                  switch (action?.type) {
                    case 'insert': {
                      // Insert into editor.
                      const text = action.text + '\n';
                      view.dispatch({
                        changes: { from: pos, insert: text },
                        selection: { anchor: pos + text.length },
                      });
                      break;
                    }
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
