//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback, useRef } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import { type TextEditorProps, type TextEditorRef, MarkdownEditor, setFocus } from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';
import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownProperties } from '../types';

export type EditorMainProps = {
  editorRefCb?: RefCallback<TextEditorRef>;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded'; // TODO(burdon): Separate components.
} & Pick<TextEditorProps, 'model' | 'readonly' | 'comments' | 'extensions' | 'editorMode'>;

// TODO(burdon): Don't export ref.
export const EditorMain = ({ editorRefCb, properties, layout, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;

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
