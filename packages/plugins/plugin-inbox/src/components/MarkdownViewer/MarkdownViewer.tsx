//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  AnchorInlineWidget,
  type Extension,
  type ThemeExtensionsOptions,
  type XmlWidgetProps,
  type XmlWidgetRegistry,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  xmlTags,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { inboxMarkdown } from '../../extensions';

const inlinePreviewRegistry: XmlWidgetRegistry = {
  'link-preview': {
    block: false,
    urlSchemes: ['dxn:', 'echo:'],
    factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
      typeof label === 'string' && typeof dxn === 'string'
        ? new AnchorInlineWidget({}, { label, dxn })
        : null,
  },
};

export type MarkdownViewerProps = ThemedClassName<{
  content: string;
  /** Render markdown decorations; pass `false` for plain text. */
  markdown?: boolean;
  /** Theme slots forwarded to `createThemeExtensions` (e.g. content padding). */
  slots?: ThemeExtensionsOptions['slots'];
  /**
   * Inbox message rendering: dxn previews, optional remote-image suppression, and blank-line cleanup.
   * Omit for generic markdown (e.g. calendar event descriptions).
   */
  loadRemoteImages?: boolean;
  /** Extensions appended after the read-only markdown core. */
  extensions?: Extension[];
}>;

/**
 * Read-only CodeMirror viewer for markdown/plain text (message bodies, event descriptions, …).
 * Owns the shared read-only core (basic extensions, theme, markdown) and inbox message rendering when
 * `loadRemoteImages` is set; callers may append extra extensions via `extensions`.
 */
// TODO(burdon): Use react-ui-editor.
export const MarkdownViewer = ({
  content,
  markdown = true,
  slots,
  loadRemoteImages,
  extensions: extensionsProp,
  classNames,
}: MarkdownViewerProps) => {
  const { themeMode } = useThemeContext();

  const extensions = useMemo<Extension[]>(
    () =>
      [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createThemeExtensions({ themeMode, slots }),
        markdown && [createMarkdownExtensions(), xmlTags({ registry: inlinePreviewRegistry }), inboxMarkdown({ loadRemoteImages })].filter(isTruthy),
        extensionsProp,
      ].filter(isTruthy),
    [themeMode, markdown, slots, loadRemoteImages, extensionsProp],
  );

  const { parentRef } = useTextEditor(
    {
      initialValue: content,
      extensions,
    },
    [content, extensions],
  );

  return (
    <div className={mx('flex overflow-hidden', classNames)} data-popover-collision-boundary={true} ref={parentRef} />
  );
};
