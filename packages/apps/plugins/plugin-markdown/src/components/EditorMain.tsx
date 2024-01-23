//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback, type PropsWithChildren, type MutableRefObject } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { Main, useTranslation } from '@dxos/react-ui';
import {
  type TextEditorProps,
  type Comment,
  type EditorView,
  MarkdownEditor,
  setFocus,
  useComments,
  useTextEditor,
} from '@dxos/react-ui-editor';
import {
  baseSurface,
  focusRing,
  inputSurface,
  mx,
  surfaceElevation,
  textBlockWidth,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  /**
   * @deprecated
   */
  // TODO(burdon): Don't export ref.
  editorRefCb?: RefCallback<EditorView>;
  comments?: Comment[];
} & Pick<TextEditorProps, 'model' | 'readonly' | 'editorMode' | 'extensions'>;

export const EditorMain = ({ editorRefCb, comments, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  const [editorRef, editorView] = useTextEditor();
  useComments(editorView, comments);

  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const { object } = data;
        if (editorView) {
          setFocus(editorView, object);
        }
        break;
      }
    }
  });

  return (
    <MarkdownEditor
      ref={editorRef}
      autoFocus
      placeholder={t('editor placeholder')}
      slots={{
        root: {
          className: mx('flex flex-col grow m-0.5', inputSurface, focusRing, surfaceElevation({ elevation: 'group' })),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          className: 'h-full pli-10 py-4 rounded',
        },
      }}
      {...props}
    />
  );
};

// TODO(wittjosiah): Remove ref.
export const MainLayout = ({ children }: PropsWithChildren<{ editorRef?: MutableRefObject<EditorView> }>) => {
  return (
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx('flex flex-col h-full pli-2', textBlockWidth)}>
        <div role='none' className='flex flex-col grow pb-8 overflow-y-auto'>
          {children}
        </div>
      </div>
    </Main.Content>
  );
};

// Used when the editor is embedded in another context (e.g., iframe) and has no topbar/sidebar/etc.
// TODO(wittjosiah): What's the difference between this and Section/Card?
export const EmbeddedLayout = ({ children }: PropsWithChildren<{}>) => {
  return <Main.Content classNames='min-bs-[100dvh] flex flex-col p-0.5'>{children}</Main.Content>;
};
