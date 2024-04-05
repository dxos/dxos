//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Extension,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useDocAccessor,
  useTextEditor,
  createMarkdownExtensions,
  Toolbar,
  useActionHandler,
  useFormattingState,
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';

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
  const { doc, accessor } = useDocAccessor(document.content!);
  const [formattingState, formattingObserver] = useFormattingState();
  const { parentRef, view: editorView } = useTextEditor(
    () => ({
      doc,
      extensions: [
        formattingObserver,
        createBasicExtensions({ placeholder: t('editor placeholder') }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({
          themeMode,
        }),
        createDataExtensions({ id: document.id, text: accessor, space, identity }),
        ...extensions,
      ],
    }),
    [document, extensions, themeMode],
  );
  const handleAction = useActionHandler(editorView);

  return (
    <div role='none' className='contents group'>
      {toolbar && (
        <Toolbar.Root
          state={formattingState}
          onAction={handleAction}
          classNames={['z-[1] invisible group-focus-within:visible', sectionToolbarLayout]}
        >
          <Toolbar.Markdown />
          <Toolbar.Separator />
        </Toolbar.Root>
      )}
      <div ref={parentRef} className='min-bs-[8rem]' data-testid='composer.markdownRoot' />
    </div>
  );
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
