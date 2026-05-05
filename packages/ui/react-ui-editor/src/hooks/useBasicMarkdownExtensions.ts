//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

export type UseBasicMarkdownExtensionsOptions = {
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Enables markdown visual decorations. Pass `false` to disable. Defaults to `true`. */
  decorate?: boolean;
  /**
   * Extra extensions appended to the returned array.
   * Callers must memoize this array — it is used as a dependency of {@link useMemo}.
   */
  extensions?: Extension[];
};

/**
 * Returns the standard CodeMirror extension stack for an inline markdown editor:
 * basic editor behaviors, themed syntax highlighting (theme mode read from {@link useThemeContext}),
 * markdown parsing, and visual decorations.
 *
 * Used by surfaces such as `AgentProperties` and `MagazineProperties` to render the
 * `instructions` field of an object as a small editable markdown block.
 *
 * The memoization depends on primitive option values plus the `extensions` array reference,
 * so callers passing fresh option literals each render still hit the cache.
 */
export const useBasicMarkdownExtensions = ({
  placeholder,
  decorate = true,
  extensions,
}: UseBasicMarkdownExtensionsOptions = {}): Extension[] => {
  const { themeMode } = useThemeContext();
  return useMemo(
    () => [
      createBasicExtensions({ placeholder }),
      createThemeExtensions({ syntaxHighlighting: true, themeMode }),
      createMarkdownExtensions(),
      ...(decorate ? [decorateMarkdown()] : []),
      ...(extensions ?? []),
    ],
    [placeholder, themeMode, decorate, extensions],
  );
};
