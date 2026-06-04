//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  EditorView,
  type Extension,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

export type MarkdownViewerProps = ThemedClassName<{
  content: string;
  /** Render markdown decorations; pass `false` for plain text. */
  markdown?: boolean;
  /** Theme slots forwarded to `createThemeExtensions` (e.g. content padding). */
  slots?: ThemeExtensionsOptions['slots'];
  /** Mode-specific extensions appended after the read-only markdown core. */
  extensions?: Extension[];
}>;

/**
 * Read-only CodeMirror viewer for markdown/plain text (message bodies, event descriptions, …).
 * Owns the shared core — read-only, line-wrapping, search, theme, markdown, and open-links-in-a-new-tab —
 * so callers only supply mode-specific decorations via `extensions`.
 */
export const MarkdownViewer = ({
  content,
  markdown = true,
  slots,
  extensions: extra,
  classNames,
}: MarkdownViewerProps) => {
  const { themeMode } = useThemeContext();

  const extensions = useMemo<Extension[]>(
    () => [
      createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
      createThemeExtensions({ themeMode, slots }),
      ...(markdown ? [createMarkdownExtensions()] : []),
      // Read-only viewer: open links in a new tab rather than navigating the editor.
      EditorView.domEventHandlers({
        click: (event) => {
          const anchor = (event.target as Element | null)?.closest('a.cm-link') as HTMLAnchorElement | null;
          if (anchor?.href) {
            event.preventDefault();
            window.open(anchor.href, '_blank', 'noopener,noreferrer');
            return true;
          }
          return false;
        },
      }),
      ...(extra ?? []),
    ],
    [themeMode, markdown, slots, extra],
  );

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div className={mx('flex overflow-hidden', classNames)} data-popover-collision-boundary={true} ref={parentRef} />
  );
};
