//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { type UseTextEditorProps, useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import {
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createThemeExtensions,
  filterChars,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type GridEditBox } from '../Grid/index.ts';
import { type EditorBlurHandler } from './editor-keys.ts';

const INDICATOR = 'var(--dx-grid-focus-indicator-width)';

export type CellEditorProps = {
  value?: string;
  extensions?: Extension;
  box?: GridEditBox;
  gridId?: string;
  onBlur?: EditorBlurHandler;
} & Pick<UseTextEditorProps, 'autoFocus'> &
  Pick<ThemeExtensionsOptions, 'slots'>;

export const CellEditor = ({ value, extensions, box, gridId, autoFocus, slots, onBlur }: CellEditorProps) => {
  const themeMode = Hooks.useThemeMode();
  const { parentRef } = useTextEditor(() => {
    return {
      autoFocus,
      initialValue: value,
      selection: { anchor: value?.length ?? 0 },
      extensions: [
        extensions ?? [],
        filterChars(/[\n\r]+/),
        // Observe the underlying blur DOM event rather than `EditorView.focusChangeEffect`. The
        // focus-change facet fires asynchronously (CodeMirror schedules it on a 10ms setTimeout),
        // which means in React strict mode the destroy → blur of the first EditorView runs the
        // callback after the second view has mounted — committing stale data and closing the
        // editor on the user's first keystroke. Deferring via `queueMicrotask` runs the check
        // *after* `view.destroy()` finishes its synchronous body (which calls `dom.remove()`),
        // so `view.dom.isConnected === false` reliably distinguishes a programmatic teardown
        // from a real user blur. Pass `undefined` on teardown so downstream handlers can consume
        // any pending suppress-next-blur flag without committing stale data.
        EditorView.domEventObservers({
          blur: (_event, view) => {
            const doc = view.state.doc.toString();
            queueMicrotask(() => {
              onBlur?.(view.dom.isConnected ? doc : undefined);
            });
          },
        }),
        createBasicExtensions({ lineWrapping: true }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: {
              className: mx(
                'min-w-full! w-min! !max-w-(--dx-grid-cell-editor-max-inline-size) min-h-full! !max-h-(--dx-grid-cell-editor-max-block-size)',
                slots?.editor?.className,
              ),
            },
            scroller: {
              className: mx(
                // The editor's box starts where the cell's padding box does, so the cell's own block padding (with the
                // line at the top, as the cell sets it) keeps the text where it was when editing starts.
                'overflow-x-hidden! py-(--dx-grid-cell-editor-padding-block)! pe-0! pl-(--dx-grid-cell-editor-padding-inline)! items-start!',
                slots?.scroller?.className,
              ),
            },
            content: {
              // Natural height, so the line sits at the top as in the cell rather than stretching to fill.
              className: mx('break-normal! min-h-auto!', slots?.content?.className),
            },
          },
        }),
      ],
    };
  }, [extensions, autoFocus, value, onBlur, themeMode, slots]);

  return (
    <div
      data-testid='grid.cell-editor'
      ref={parentRef}
      // `grid` (not block) so the editor stretches to the cell: the container's height comes from
      // `minBlockSize`, and a percentage height resolves against `auto` — so the editor sized itself
      // to its content and left a strip of dead cell below. A grid row still grows for a taller value.
      className='absolute z-[1] grid dx-grid__cell-editor'
      style={{
        // One indicator width up and left, so the border covers the neighbouring cells' grid lines (see dx-grid.pcss).
        insetInlineStart: box ? `calc(${box.insetInlineStart}px - ${INDICATOR})` : '0px',
        insetBlockStart: box ? `calc(${box.insetBlockStart}px - ${INDICATOR})` : '0px',
        minInlineSize: box ? `calc(${box.inlineSize}px + ${INDICATOR})` : '180px',
        minBlockSize: box ? `calc(${box.blockSize}px + ${INDICATOR})` : '32px',
        ...{ '--dx-grid-cell-width': `${box?.inlineSize ?? 200}px` },
      }}
      {...(gridId && { 'data-grid': gridId })}
    />
  );
};
