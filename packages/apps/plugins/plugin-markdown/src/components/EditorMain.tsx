//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback, type MutableRefObject, type PropsWithChildren } from 'react';

import { useTranslation, Main } from '@dxos/react-ui';
import { type TextEditorProps, type TextEditorRef, MarkdownEditor, type EditorModel } from '@dxos/react-ui-editor';
import {
  focusRing,
  inputSurface,
  mx,
  surfaceElevation,
  baseSurface,
  topbarBlockPaddingStart,
  textBlockWidth,
} from '@dxos/react-ui-theme';

import { useExtensions, type UseExtensionsOptions } from './extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownProperties } from '../types';

export type SearchResult = {
  text: string;
  url: string;
};

export type EditorMainProps = {
  editorRefCb?: RefCallback<TextEditorRef>;
  properties: MarkdownProperties;
  layout?: 'main' | 'embedded';
  extensions?: UseExtensionsOptions;
} & Pick<TextEditorProps, 'readonly' | 'model' | 'comments' | 'editorMode'>;

export const EditorMain = ({
  editorRefCb,
  properties,
  layout = 'main',
  extensions: _extensions,
  readonly,
  model,
  comments,
  editorMode,
}: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : MainLayout;
  const extensions = useExtensions(_extensions);

  return (
    <Root properties={properties} model={model}>
      <MarkdownEditor
        ref={editorRefCb}
        model={model}
        comments={comments}
        readonly={readonly}
        editorMode={editorMode}
        extensions={extensions}
        slots={{
          root: {
            role: 'none',
            className: mx(
              focusRing,
              inputSurface,
              surfaceElevation({ elevation: 'group' }),
              layout !== 'embedded' && 'rounded',
              'flex flex-col shrink-0 grow pli-10 m-0.5 py-2',
            ),
            'data-testid': 'composer.markdownRoot',
          } as HTMLAttributes<HTMLDivElement>,
          editor: {
            placeholder: t('editor placeholder'),
            theme: {
              '&, & .cm-scroller': {
                display: 'flex',
                flexDirection: 'column',
                flex: '1 0 auto',
                inlineSize: '100%',
              },
              '& .cm-content': {
                flex: '1 0 auto',
                inlineSize: '100%',
                paddingBlock: '1rem',
              },
            },
          },
        }}
      />
    </Root>
  );
};

const MainLayout = ({
  children,
}: PropsWithChildren<{
  model: EditorModel;
  properties: MarkdownProperties;
  // TODO(wittjosiah): ForwardRef.
  editorRef?: MutableRefObject<TextEditorRef>;
}>) => {
  return (
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div role='none' className='flex flex-col min-bs-[calc(100dvh-var(--topbar-size))] pb-8'>
          {children}
        </div>

        {/* Overscroll area. */}
        <div role='none' className='bs-[50dvh]' />
      </div>
    </Main.Content>
  );
};

// Used when the editor is embedded in another context (e.g., iframe) and has no topbar/sidebar/etc.
// TODO(wittjosiah): What's the difference between this and Section/Card?
const EmbeddedLayout = ({ children }: PropsWithChildren<{}>) => {
  return <Main.Content classNames='min-bs-[100dvh] flex flex-col p-0.5'>{children}</Main.Content>;
};
