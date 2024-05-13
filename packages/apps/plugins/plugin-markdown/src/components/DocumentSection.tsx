//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { createDocAccessor, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Extension,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useTextEditor,
  createMarkdownExtensions,
  Toolbar,
  useActionHandler,
  useFormattingState,
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

const DocumentSection: FC<{
  document: DocumentType;
  extensions: Extension[];
  toolbar?: boolean;
}> = ({ document, extensions }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const identity = useIdentity();
  const space = getSpace(document);

  const { themeMode } = useThemeContext();
  const [formattingState, formattingObserver] = useFormattingState();
  const {
    parentRef,
    view: editorView,
    focusAttributes,
  } = useTextEditor(
    () => ({
      doc: document.content?.content,
      extensions: [
        formattingObserver,
        createBasicExtensions({ placeholder: t('editor placeholder') }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({
          themeMode,
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
    [document, extensions, themeMode],
  );
  const handleAction = useActionHandler(editorView);

  return (
    <div role='none' className='flex flex-col'>
      <div
        {...focusAttributes}
        ref={parentRef}
        className={mx('min-bs-[8rem] order-last rounded-sm', focusRing)}
        data-testid='composer.markdownRoot'
      />
      {toolbar && (
        <Toolbar.Root
          state={formattingState}
          onAction={handleAction}
          classNames={['z-[1] invisible group-focus-within/section:visible', sectionToolbarLayout]}
        >
          <Toolbar.Markdown />
          <Toolbar.Separator />
        </Toolbar.Root>
      )}
    </div>
  );
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
