//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { TextEditor } from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions, folding, json } from '@dxos/ui-editor';
import { safeStringify } from '@dxos/util';

export type SpanTreeViewProps = ThemedClassName<{
  spanTree: unknown;
}>;

/**
 * The trace's span tree as read-only JSON.
 *
 * CodeMirror puts only the lines in view into the DOM and parses the rest in time-sliced chunks, so
 * showing a tree stops costing what the tree is worth — a highlighter renders every one of its lines
 * in one synchronous pass. `TextEditor` rather than `Editor.View`: this pane has no toolbar, so the
 * compound component's context would only be wiring nothing reads.
 */
export const SpanTreeView = ({ classNames, spanTree }: SpanTreeViewProps) => {
  const { themeMode } = useThemeContext();
  const value = useMemo(() => safeStringify(spanTree, undefined, 2), [spanTree]);
  const extensions = useMemo(
    () => [
      createBasicExtensions({ readOnly: true, lineWrapping: false, search: true }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true }),
      json(),
      folding(),
    ],
    [themeMode],
  );

  return <TextEditor classNames={['text-xs', classNames]} value={value} extensions={extensions} />;
};
