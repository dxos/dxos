//
// Copyright 2023 DXOS.org
//

import React, {
  type HTMLAttributes,
  type RefCallback,
  useRef,
  type PropsWithChildren,
  type MutableRefObject,
} from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { Main, useTranslation } from '@dxos/react-ui';
import { type TextEditorProps, type EditorView, MarkdownEditor, setFocus } from '@dxos/react-ui-editor';
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
  editorRefCb?: RefCallback<EditorView>;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'comments' | 'extensions' | 'editorMode'>;

export const EditorMain = ({ editorRefCb, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  // TODO(burdon): Reconcile refs.
  const editorRef = useRef<EditorView>();
  const setEditorRef: RefCallback<EditorView> = (ref) => {
    editorRef.current = ref as any;
    editorRefCb?.(ref);
  };

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
      theme={{
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
      }}
      slots={{
        editor: {
          className: mx(
            focusRing,
            inputSurface,
            surfaceElevation({ elevation: 'group' }),
            'flex flex-col shrink-0 grow pli-10 m-0.5 py-2',
            'rounded',
          ),
          'data-testid': 'composer.markdownRoot', // TODO(burdon): ???
        } as HTMLAttributes<HTMLDivElement>,
      }}
    />
  );
};

// TODO(burdon): Factor out layout wrappers to be reusable across plugins.

// TODO(wittjosiah): Remove ref.
export const MainLayout = ({ children }: PropsWithChildren<{ editorRef?: MutableRefObject<EditorView> }>) => {
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
export const EmbeddedLayout = ({ children }: PropsWithChildren<{}>) => {
  return <Main.Content classNames='min-bs-[100dvh] flex flex-col p-0.5'>{children}</Main.Content>;
};
