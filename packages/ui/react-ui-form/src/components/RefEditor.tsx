//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { ControlFrame, type ControlFrameProps } from '@dxos/react-ui';
import { Editor, type EditorController, type EditorViewProps } from '@dxos/react-ui-editor';

import { type RefEditorOptions, useRefEditor } from './useRefEditor.ts';

export type RefEditorProps = RefEditorOptions &
  Pick<EditorViewProps, 'onChange' | 'autoFocus' | 'extensions'> & {
    'value'?: string;
    /** Leading content inside the frame (e.g. an Icon). */
    'start'?: ControlFrameProps['start'];
    /** Trailing content inside the frame (e.g. icon-only Buttons). */
    'end'?: ControlFrameProps['end'];
    'data-testid'?: string;
  };

/**
 * The single-line reference editor (see the current `RefEditor`) in a `ControlFrame`: the frame draws the control's
 * well, size and focus ring around the editor, which fills it between the optional adornments.
 */
export const RefEditor = forwardRef<EditorController, RefEditorProps>(
  ({ value, onChange, autoFocus, extensions, start, end, 'data-testid': testId, ...options }, forwardedRef) => {
    const rootProps = useRefEditor(options, forwardedRef);
    return (
      <Editor.Root {...rootProps}>
        <ControlFrame start={start} end={end} disabled={options.readonly} data-testid={testId}>
          <Editor.View
            initialValue={value}
            extensions={extensions}
            onChange={onChange}
            autoFocus={autoFocus}
            selectionEnd
          />
        </ControlFrame>
      </Editor.Root>
    );
  },
);

RefEditor.displayName = 'RefEditor';
