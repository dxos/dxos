//
// Copyright 2024 DXOS.org
//

import { StateField } from '@codemirror/state';
import { type EditorView, type Tooltip, type TooltipView, showTooltip } from '@codemirror/view';

import { type RenderCallback } from '../../types';
import { singleValueFacet } from '../../util';

import { type Action, closeEffect, openEffect } from './action';
import { type CommandOptions } from './command-dialog';

export const commandConfig = singleValueFacet<CommandOptions>();

export type PopupOptions = {
  renderDialog: RenderCallback<{ onAction: (action?: Action) => void }>;
};

type CommandState = {
  tooltip?: Tooltip;
};

/**
 * @deprecated
 */
export const commandState = StateField.define<CommandState>({
  create: () => ({}),
  update: (state, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(closeEffect)) {
        return {};
      }

      const { renderDialog } = tr.state.facet(commandConfig);
      if (effect.is(openEffect) && renderDialog) {
        const { pos, fullWidth } = effect.value;
        const tooltip: Tooltip = {
          pos,
          above: false,
          arrow: false,
          strictSide: true,
          create: (view: EditorView) => {
            const root = document.createElement('div');
            const tooltipView: TooltipView = {
              dom: root,
              mount: (view: EditorView) => {
                if (fullWidth) {
                  const parent = root.parentElement!;
                  const { paddingLeft, paddingRight } = window.getComputedStyle(parent);
                  const widthWithoutPadding = parent.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
                  root.style.width = `${widthWithoutPadding}px`;
                }

                // Render react component.
                // TODO(burdon): Use Popover.
                renderDialog(
                  root,
                  {
                    onAction: (action) => {
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
                    },
                  },
                  view,
                );
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
