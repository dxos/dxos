//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { useResolvePlugin, parseFileManagerPlugin } from '@dxos/app-framework';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { localStorageStateStoreAdapter, type EditorSelectionState } from '@dxos/react-ui-editor';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';
import { useExtensions } from '../extensions';
import { type DocumentType, type MarkdownPluginState, type MarkdownSettingsProps } from '../types';
import { getFallbackName } from '../util';

type DocumentEditorProps = {
  document: DocumentType;
  settings: MarkdownSettingsProps;
} & Omit<MarkdownEditorProps, 'id' | 'inputMode' | 'toolbar' | 'extensions'> &
  Pick<MarkdownPluginState, 'extensionProviders'>;

export const DocumentEditor = ({
  document: doc,
  extensionProviders,
  settings,
  viewMode,
  ...props
}: DocumentEditorProps) => {
  const id = fullyQualifiedId(doc);
  const space = getSpace(doc);
  const initialValue = useMemo(() => doc.content?.content, [doc.content]);
  const extensions = useExtensions({ extensionProviders, document: doc, settings, viewMode });

  // Migrate gradually to `fallbackName`.
  useEffect(() => {
    if (!doc.fallbackName && doc.content?.content) {
      doc.fallbackName = getFallbackName(doc.content.content);
    }
  }, [doc, doc.content]);

  // Restore last selection and scroll point.
  const { scrollTo, selection } = useMemo<EditorSelectionState>(
    () => localStorageStateStoreAdapter.getState(id) ?? {},
    [doc],
  );

  // File dragging.
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);
  const handleFileUpload = useMemo(() => {
    if (space === undefined || fileManagerPlugin?.provides.file.upload === undefined) {
      return undefined;
    }

    // TODO(burdon): Re-order props: space, file.
    return async (file: File) => fileManagerPlugin?.provides?.file?.upload?.(file, space);
  }, [space, fileManagerPlugin]);

  return (
    <MarkdownEditor
      id={id}
      initialValue={initialValue}
      extensions={extensions}
      scrollTo={scrollTo}
      selection={selection}
      toolbar={settings.toolbar}
      inputMode={settings.editorInputMode}
      viewMode={viewMode}
      onFileUpload={handleFileUpload}
      {...props}
    />
  );
};
