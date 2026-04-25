//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  type DecorateOptions,
  type MarkdownBundleOptions,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

export type UseBasicMarkdownExtensionsOptions = {
  /** Options forwarded to {@link createBasicExtensions}. */
  basic?: BasicExtensionsOptions;
  /** Options forwarded to {@link createThemeExtensions}; `themeMode` is supplied by {@link useThemeContext}. */
  theme?: Omit<ThemeExtensionsOptions, 'themeMode'>;
  /** Options forwarded to {@link createMarkdownExtensions}. */
  markdown?: MarkdownBundleOptions;
  /** Options forwarded to {@link decorateMarkdown}; pass `false` to disable decoration. */
  decorate?: DecorateOptions | false;
  /** Extra extensions appended to the returned array (e.g., per-instance data binding). */
  extensions?: Extension[];
};

/**
 * Returns the standard CodeMirror extension stack for an inline markdown editor:
 * basic editor behaviors, themed syntax highlighting (theme mode read from React context),
 * markdown parsing, and visual decorations.
 *
 * Used by surfaces such as `AgentProperties` and `MagazineProperties` to render the
 * `instructions` field of an object as a small editable markdown block.
 */
export const useBasicMarkdownExtensions = ({
  basic,
  theme,
  markdown,
  decorate,
  extensions,
}: UseBasicMarkdownExtensionsOptions = {}): Extension[] => {
  const { themeMode } = useThemeContext();
  return useMemo(
    () => [
      createBasicExtensions(basic),
      createThemeExtensions({ syntaxHighlighting: true, ...theme, themeMode }),
      createMarkdownExtensions(markdown),
      ...(decorate === false ? [] : [decorateMarkdown(decorate || undefined)]),
      ...(extensions ?? []),
    ],
    [basic, theme, themeMode, markdown, decorate, extensions],
  );
};
