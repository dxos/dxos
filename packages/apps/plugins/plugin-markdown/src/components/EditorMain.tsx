//
// Copyright 2023 DXOS.org
//

import React, {
  type HTMLAttributes,
  type RefCallback,
  type PropsWithChildren,
  type MutableRefObject,
  useRef,
} from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { Main, useTranslation } from '@dxos/react-ui';
import {
  type TextEditorProps,
  type Comment,
  type EditorView,
  MarkdownEditor,
  setFocus,
  useComments,
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

// TODO(burdon): Don't export ref.
export type EditorMainProps = {
  /**
   * @deprecated
   */
  editorRefCb?: RefCallback<EditorView>;
  comments?: Comment[];
} & Pick<TextEditorProps, 'model' | 'readonly' | 'editorMode' | 'extensions'>;

export const EditorMain = ({ editorRefCb, comments, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  const editorRef = useRef<EditorView>();

  // TODO(burdon): Remove.
  const setEditorRef: RefCallback<EditorView> = (ref) => {
    editorRef.current = ref as any;
    editorRefCb?.(ref);
  };

  useComments(editorRef.current, comments);

  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const { object } = data;
        setFocus(editorRef.current!, object);
      }
    }
  });

  return (
    <MarkdownEditor
      {...props}
      ref={setEditorRef}
      placeholder={t('editor placeholder')}
      slots={{
        root: {
          className: mx(
            'flex flex-col grow m-0.5 overflow-y-auto rounded',
            inputSurface,
            focusRing,
            surfaceElevation({ elevation: 'group' }),
          ),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          className: 'h-full pli-10 py-2',
        },
      }}
    />
  );
};

// TODO(wittjosiah): Remove ref.
export const MainLayout = ({ children }: PropsWithChildren<{ editorRef?: MutableRefObject<EditorView> }>) => {
  // TODO(burdon): Fix scrolling issues (compare with stack).
  return (
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, 'flex h-full pli-2 overflow-hidden')}>
        <div role='none' className='flex flex-col h-full min-bs-[calc(100dvh-var(--topbar-size))] pb-8'>
          {children}

          {/* Overscroll area. */}
          <div role='none' className='bs-[50dvh]' />
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
