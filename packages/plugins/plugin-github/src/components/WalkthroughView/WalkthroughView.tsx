//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { TextEditor } from '@dxos/react-ui-editor';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Status from '@dxos/react-ui/Status';

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
  const themeMode = Hooks.useThemeMode();
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex column center gap='md' classNames='dx-expand'>
      <Status.Empty>{t(generating ? 'walkthrough-generating.message' : 'no-walkthrough.message')}</Status.Empty>
      {!generating && (
        <Button.Root variant='primary' onClick={onGenerate}>
          {t('generate-walkthrough.label')}
        </Button.Root>
      )}
    </Layout.Flex>
  );
};
