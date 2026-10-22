//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Doc } from '@dxos/echo-doc';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { type Text } from '@dxos/schema';
import { automerge, createBasicExtensions, createMarkdownExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { SlideRenderer } from '#components';
import { type SlideSource } from '#deck';

export type SlideEditorArticleProps = AppSurface.ObjectArticleProps<Text.Text>;

/**
 * Edits one owned slide's markdown beside a live preview of the rendered slide.
 */
export const SlideEditorArticle = ({ role, subject }: SlideEditorArticleProps) => {
  const themeMode = Hooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      automerge(Doc.createAccessor(subject, ['content'])),
    ],
    [subject, themeMode],
  );
  const source = useMemo((): SlideSource => ({ kind: 'text', id: subject.id, text: subject }), [subject]);

  return (
    <Panel.Root role={role}>
      <Panel.Body classNames='grid grid-cols-2 divide-x divide-separator'>
        <div className='flex overflow-hidden'>
          <Editor.Root>
            <Editor.View classNames='dx-expand p-4' extensions={extensions} />
          </Editor.Root>
        </div>
        <div data-testid='presenter.slide-editor.preview' className='relative flex overflow-hidden'>
          <SlideRenderer source={source} />
        </div>
      </Panel.Body>
    </Panel.Root>
  );
};

SlideEditorArticle.displayName = 'SlideEditorArticle';
