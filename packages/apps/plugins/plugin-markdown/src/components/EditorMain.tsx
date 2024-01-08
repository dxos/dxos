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
import { type TextEditorProps, type TextEditorRef, MarkdownEditor, setFocus } from '@dxos/react-ui-editor';
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
import type { MarkdownProperties } from '../types';

export type EditorMainProps = {
  editorRefCb?: RefCallback<TextEditorRef>;
  properties: MarkdownProperties;
  layout?: 'main' | 'embedded'; // TODO(burdon): Separate components.
} & Pick<TextEditorProps, 'model' | 'readonly' | 'comments' | 'extensions' | 'editorMode'>;

// TODO(burdon): Don't export ref.
export const EditorMain = ({ editorRefCb, properties, layout, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : MainLayout;

  // TODO(burdon): Reconcile refs.
  const editorRef = useRef<TextEditorRef>();
  const setEditorRef: RefCallback<TextEditorRef> = (ref) => {
    editorRef.current = ref as any;
    editorRefCb?.(ref);
  };

  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const { object } = data;
        setFocus(editorRef.current!.view!, object);
      }
    }
  });

  return (
    <Root properties={properties}>
      <MarkdownEditor
        {...props}
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
        ref={setEditorRef}
      />
    </Root>
  );
};

const MainLayout = ({
  children,
}: PropsWithChildren<{
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
