//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { type RefObject, useEffect, useMemo, useRef } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as UiListbox from '@dxos/react-ui/Listbox';
import * as Popover from '@dxos/react-ui/Popover';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { translationKey } from '#translations';

import {
  type CommandCompletionState,
  acceptCommandCompletion,
  closeCommandCompletion,
  selectCommandCompletion,
} from './commands.ts';

const COLUMNS = 'max-content minmax(0, 1fr)';

export type CommandPopoverProps = {
  completion: CommandCompletionState;
  /** Read on demand, so the live `EditorView` is never carried in a React prop. */
  getView: () => EditorView | null;
  anchorRef: RefObject<Element | null>;
  /** Rows visible before the list scrolls. */
  rows?: number;
};

/**
 * Renders CodeMirror's command completions as a Listbox in a portalled popover above the prompt. Focus stays in the
 * editor for type-ahead, so CodeMirror's selected completion drives the highlighted row.
 */
export const CommandPopover = ({ completion, getView, anchorRef, rows = 8 }: CommandPopoverProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const positioning = useMemo(
    () => ({ ...VirtualAnchor.virtualAnchor(anchorRef), placement: 'top-start' as const }),
    [anchorRef],
  );
  const items = useMemo<UiListbox.Option[]>(
    () => completion.options.map(({ label, detail }, index) => ({ value: String(index), label, description: detail })),
    [completion.options],
  );

  const selected = completion.selected === null ? null : String(completion.selected);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected !== null) {
      // Instant, not smooth: held arrow keys retarget faster than a smooth scroll can settle.
      contentRef.current
        ?.querySelector(`[data-value="${selected}"]`)
        ?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
  }, [selected]);

  return (
    <Popover.Root
      open={completion.open}
      positioning={positioning}
      // Focus never leaves the editor, so there is nothing to move or restore.
      autoFocus={false}
      restoreFocus={false}
      // The popover's dismiss layer takes Escape before CodeMirror sees it, so the close is routed back here.
      onOpenChange={({ open }) => {
        const view = getView();
        if (!open && view) {
          closeCommandCompletion(view);
        }
      }}
    >
      {/* As wide as the editor, so the list lines up with both of its edges. */}
      {/* Hidden from assistive tech: the editor's `aria-activedescendant` follows CodeMirror's own (visually hidden) list. */}
      <Popover.Content arrow={false} aria-hidden classNames='w-(--reference-width) max-w-(--reference-width)'>
        <Listbox.Root items={items} columns={COLUMNS} style={{ maxBlockSize: `calc(var(--dx-block-size) * ${rows})` }}>
          <Listbox.Viewport>
            <Listbox.Content
              // Hosts that do not register this package's translations still get a name.
              aria-label={t('commands.label', { defaultValue: 'Commands' })}
              // Keeps focus in the editor for type-ahead: zag's row mousedown would focus the listbox instead.
              onMouseDownCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              ref={contentRef}
            >
              {items.map((item, index) => (
                <Listbox.Item
                  key={item.value}
                  id={item.value}
                  // zag marks a row highlighted only while the listbox has focus, which stays in the editor here.
                  data-highlighted={item.value === selected ? '' : undefined}
                  classNames='cursor-pointer'
                  // Movement, not entry: a row scrolled under a still pointer must not take the selection.
                  onPointerMove={() => {
                    const view = getView();
                    if (view) {
                      selectCommandCompletion(view, index);
                    }
                  }}
                  onClick={() => {
                    const view = getView();
                    if (view) {
                      acceptCommandCompletion(view, index);
                    }
                  }}
                >
                  <Listbox.ItemText classNames='font-mono' />
                  {item.description && <Listbox.ItemDescription />}
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      </Popover.Content>
    </Popover.Root>
  );
};
