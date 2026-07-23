//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { type EditorViewProps, Editor as TextEditor } from '@dxos/react-ui-editor';
import {
  type Extension,
  compactSlots,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

export type EditorProps = ThemedClassName<
  Pick<EditorViewProps, 'value' | 'onChange'> & {
    /** Domain-specific extensions composed after the basic/theme defaults (automerge binding, composer actions, …). */
    extensions?: Extension[];
    placeholder?: string;
    lineWrapping?: boolean;
    /** Render markdown decorations; omit for plain text. */
    markdown?: boolean;
    /** Dense theme slots for editors embedded in forms (e.g. the message composer). */
    compact?: boolean;
  }
>;

/**
 * Shared CodeMirror editor for the inbox: composes the standard basic + theme (+ optional markdown)
 * extensions with the caller's domain extensions, then renders react-ui-editor's `Editor.View`.
 * Serves both the controlled message composer (`value`/`onChange`) and the automerge-bound event body
 * editor (no `value` — the passed automerge extension drives the doc).
 */
export const Editor = ({
  extensions: extensionsProp,
  value,
  onChange,
  placeholder,
  lineWrapping,
  markdown,
  compact,
  classNames,
}: EditorProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () =>
      [
        createBasicExtensions({ placeholder, lineWrapping }),
        createThemeExtensions({ themeMode, slots: compact ? compactSlots : undefined }),
        markdown && createMarkdownExtensions(),
        ...(extensionsProp ?? []),
      ].filter(isTruthy),
    [placeholder, lineWrapping, themeMode, compact, markdown, extensionsProp],
  );

  return (
    <TextEditor.Root>
      <TextEditor.View
        classNames={mx('dx-expander border border-input-separator rounded-xs', classNames)}
        extensions={extensions}
        value={value}
        onChange={onChange}
      />
    </TextEditor.Root>
  );
};

Editor.displayName = 'Editor';
