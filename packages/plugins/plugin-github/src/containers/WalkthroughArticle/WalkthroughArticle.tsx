//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffBlocks,
  walkthroughSidebar,
  walkthroughTheme,
} from '@dxos/ui-editor';

import { type Walkthrough } from '#types';

/** A definite content width, which the diff chunks cap themselves against. */
const slots: ThemeExtensionsOptions['slots'] = {
  content: { className: 'dx-container-type-inline-size w-full mx-auto! max-w-[min(72rem,100%-3rem)] py-3!' },
};

export type WalkthroughArticleProps = AppSurface.ObjectArticleProps<Walkthrough.Walkthrough>;

/** Read-only rendering of a walkthrough: its markdown prose with the ```diff fences drawn as chunks. */
export const WalkthroughArticle = ({ role, subject }: WalkthroughArticleProps) => {
  const { themeMode } = useThemeContext();
  const [body] = useObject(subject, 'body');
  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode, slots }),
      createBasicExtensions({ lineWrapping: true, readOnly: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      walkthroughTheme(),
      diffBlocks({}),
      walkthroughSidebar({}),
    ],
    [themeMode],
  );
  // The body is replaced wholesale on regeneration, so the editor is rebuilt rather than patched.
  const { parentRef } = useTextEditor({ initialValue: body ?? '', extensions }, [extensions, body]);

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <div ref={parentRef} className='dx-fill overflow-auto' />
      </Panel.Content>
    </Panel.Root>
  );
};
