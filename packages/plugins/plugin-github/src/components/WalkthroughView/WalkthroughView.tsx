//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Flex, Next, useTranslation } from '@dxos/react-ui';
import { TextEditor } from '@dxos/react-ui-editor';

import { meta } from '#meta';

import { spaceHeadings } from '../../walkthrough/headings.ts';
import { type DiffDocumentOptions, diffDocumentExtensions } from './extensions.ts';

export type WalkthroughViewProps = Omit<DiffDocumentOptions, 'themeMode'> & {
  /** The markdown document: prose, headings and ```diff fences. */
  value: string;
};

/**
 * A read-only diff document: a whole walkthrough with its navigation rail, or one file's change as a
 * single fence. Either way the chunks are the walkthrough's own, so a file reads the same in both.
 */
export const WalkthroughView = ({ value, sidebar, layout, onLineComment }: WalkthroughViewProps) => {
  const themeMode = Next.useThemeMode();
  const extensions = useMemo(
    () => diffDocumentExtensions({ themeMode, sidebar, layout, onLineComment }),
    [themeMode, sidebar, layout, onLineComment],
  );

  // Walkthroughs stored before generation spaced their headings still read with a blank line above each.
  const markdown = useMemo(() => spaceHeadings(value), [value]);

  // Only CodeMirror's own scroller may scroll: it carries the editor's themed scrollbar, whereas an
  // overflowing host would draw the browser's.
  return (
    <TextEditor value={markdown} extensions={extensions} focusable={false} classNames='dx-expand overflow-hidden' />
  );
};

export type WalkthroughPlaceholderProps = {
  generating?: boolean;
  onGenerate: () => void;
};

/** What the walkthrough tab shows before there is a walkthrough: the offer to write one, or its progress. */
export const WalkthroughPlaceholder = ({ generating, onGenerate }: WalkthroughPlaceholderProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Flex column center gap='md' classNames='dx-expand'>
      <Next.Empty>{t(generating ? 'walkthrough-generating.message' : 'no-walkthrough.message')}</Next.Empty>
      {!generating && (
        <Next.Button variant='primary' onClick={onGenerate}>
          {t('generate-walkthrough.label')}
        </Next.Button>
      )}
    </Flex>
  );
};
