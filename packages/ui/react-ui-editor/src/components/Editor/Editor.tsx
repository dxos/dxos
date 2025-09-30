//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type UseTextEditorProps, useTextEditor } from '../../hooks';

export type EditorProps = ThemedClassName<UseTextEditorProps>;

/**
 * Minimal text editor.
 */
export const Editor = forwardRef<EditorView | undefined, EditorProps>(
  ({ classNames, id, extensions, ...props }, forwardedRef) => {
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        extensions,
        ...props,
      }),
      [id, extensions],
    );

    useImperativeHandle(forwardedRef, () => view, [view]);
    return <div role='none' className={mx(classNames)} {...focusAttributes} ref={parentRef} />;
  },
);
