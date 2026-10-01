//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { Editor, type EditorController, type EditorViewProps } from '@dxos/react-ui-editor';
import { Next } from '@dxos/react-ui/next';
import { type ClassNameValue } from '@dxos/ui-types';

import { type RefEditorOptions, useRefEditor } from '../components/RefEditor/RefEditor.tsx';

export type RefEditorProps = RefEditorOptions &
  Pick<EditorViewProps, 'onChange' | 'autoFocus' | 'extensions'> & {
    'value'?: string;
    /** Layout classes for the frame (e.g. its grid placement). */
    'classNames'?: ClassNameValue;
    /** Leading content inside the frame (e.g. an Icon). */
    'start'?: Next.ControlFrameProps['start'];
    /** Trailing content inside the frame (e.g. icon-only Buttons). */
    'end'?: Next.ControlFrameProps['end'];
    'data-testid'?: string;
  };

/**
 * The single-line reference editor (see the current `RefEditor`) in a `Next.ControlFrame`: the frame draws the control's
 * well, size and focus ring around the editor, which fills it between the optional adornments.
 */
export const RefEditor = forwardRef<EditorController, RefEditorProps>(
  (
    { value, onChange, autoFocus, extensions, classNames, start, end, 'data-testid': testId, ...options },
    forwardedRef,
  ) => {
    const rootProps = useRefEditor(options, forwardedRef);
    return (
      <Editor.Root {...rootProps}>
        <Next.ControlFrame
          classNames={classNames}
          start={start}
          end={end}
          disabled={options.readonly}
          data-testid={testId}
        >
          <Editor.View
            initialValue={value}
            extensions={extensions}
            onChange={onChange}
            autoFocus={autoFocus}
            selectionEnd
          />
        </Next.ControlFrame>
      </Editor.Root>
    );
  },
);

RefEditor.displayName = 'Next.RefEditor';
