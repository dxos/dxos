//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  type Extension,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { type VocabularyOptions, vocabulary } from '#extensions';

export type ReaderPaneProps = ThemedClassName<
  Pick<VocabularyOptions, 'lookup' | 'render' | 'translate' | 'highlight'> & {
    content: string;
    /** Render markdown decorations; pass `false` to read the source with its markup intact. */
    markdown?: boolean;
  }
>;

/**
 * One read-only pane of the reader companion: the source text with vocabulary revealed.
 *
 * Read-only by construction — the companion never writes to the document it is reading, so the
 * source object stays owned by whichever plugin (markdown, inbox, …) actually renders it.
 */
export const ReaderPane = ({
  content,
  markdown = true,
  lookup,
  render,
  translate,
  highlight = true,
  classNames,
}: ReaderPaneProps) => {
  const { themeMode } = useThemeContext();

  const extensions = useMemo<Extension[]>(
    () =>
      [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createThemeExtensions({ themeMode }),
        markdown && createMarkdownExtensions(),
        vocabulary({ lookup, render, translate, highlight }),
      ].filter(isTruthy),
    [themeMode, markdown, lookup, render, translate, highlight],
  );

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return <div className={mx('flex min-h-0 overflow-hidden', classNames)} ref={parentRef} />;
};

ReaderPane.displayName = 'ReaderPane';
