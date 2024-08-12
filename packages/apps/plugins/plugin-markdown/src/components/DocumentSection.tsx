//
// Copyright 2024 DXOS.org
//

import React, { useEffect, type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { useResolvePlugin, parseLayoutPlugin } from '@dxos/app-framework';
import { createDocAccessor, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Extension,
  Toolbar,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useActionHandler,
  useCommentState,
  useCommentClickListener,
  useFormattingState,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

const DocumentSection: FC<{
  document: DocumentType;
  extensions: Extension[];
  toolbar?: boolean;
  onCommentClick?: (id: string) => void;
}> = ({ document, extensions, onCommentClick }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const identity = useIdentity();
  const space = getSpace(document);

  const { themeMode } = useThemeContext();
  const [formattingState, formattingObserver] = useFormattingState();
  const [commentState, commentObserver] = useCommentState();
  const commentClickObserver = useCommentClickListener((id) => {
    onCommentClick?.(id);
  });

  const {
    parentRef,
    view: editorView,
    focusAttributes,
  } = useTextEditor(
    () => ({
      doc: document.content?.content,
      extensions: [
        formattingObserver,
        commentObserver,
        commentClickObserver,
        createBasicExtensions({ placeholder: t('editor placeholder') }),
        createMarkdownExtensions({ themeMode }),
        // TODO(burdon): Set cm-content to grow to full height of space.
        createThemeExtensions({
          themeMode,
          slots: {
            content: {
              className: '',
            },
          },
        }),
        createDataExtensions({
          id: document.id,
          text: document.content && createDocAccessor(document.content, ['content']),
          space,
          identity,
        }),
        ...extensions,
      ],
    }),
    [document, document.content, extensions, themeMode],
  );
  const handleAction = useActionHandler(editorView);

  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const autoFocus = layoutPlugin?.provides?.layout?.scrollIntoView === document.id;

  // Set focus
  useEffect(() => {
    if (autoFocus && editorView) {
      editorView.focus();
    }
  }, [autoFocus, editorView]);

  return (
    <div role='none' className='flex flex-col'>
      <div
        {...focusAttributes}
        ref={parentRef}
        className={mx('flex flex-col flex-1 px-2 min-bs-[12rem] order-last', focusRing)}
        data-testid='composer.markdownRoot'
      />
      {toolbar && (
        <Toolbar.Root
          state={formattingState && { ...formattingState, ...commentState }}
          onAction={handleAction}
          classNames={['z-[1] invisible group-focus-within/section:visible', sectionToolbarLayout]}
        >
          <Toolbar.Markdown />
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
      )}
    </div>
  );
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
