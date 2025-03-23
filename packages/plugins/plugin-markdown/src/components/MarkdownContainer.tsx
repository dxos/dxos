//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { type EditorSelectionState, type FoldState } from '@dxos/react-ui-editor';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';
import { useExtensions } from '../extensions';
import { DocumentType, type MarkdownSettingsProps } from '../types';
import { getFallbackName } from '../util';

export type MarkdownContainerProps = Pick<
  MarkdownEditorProps,
  'role' | 'extensionProviders' | 'viewMode' | 'onViewModeChange'
> & {
  id: string;
  object: DocumentType | any;
  settings: MarkdownSettingsProps;
  selection?: Record<string, EditorSelectionState>;
  folding?: Record<string, FoldState>;
};

// TODO(burdon): Move toolbar here.
// TODO(burdon): Factor out difference for ECHO and non-ECHO objects; i.e., single component.
const MarkdownContainer = ({
  id,
  role,
  object,
  settings,
  viewMode,
  selection,
  folding,
  onViewModeChange,
}: MarkdownContainerProps) => {
  const scrollPastEnd = role === 'article';
  const doc = object instanceof DocumentType ? object : undefined;
  const extensions = useExtensions({ document: doc, settings, viewMode, selection, folding });
  const selectionState = selection?.[fullyQualifiedId(object)];

  if (doc) {
    return (
      <DocumentEditor
        id={fullyQualifiedId(object)}
        role={role}
        document={doc}
        extensions={extensions}
        viewMode={viewMode}
        settings={settings}
        scrollPastEnd={scrollPastEnd}
        selection={selectionState?.selection}
        scrollTo={selectionState?.scrollTo}
        onViewModeChange={onViewModeChange}
      />
    );
  } else {
    return (
      <MarkdownEditor
        id={id}
        role={role}
        initialValue={object.text}
        extensions={extensions}
        viewMode={viewMode}
        toolbar={settings.toolbar}
        inputMode={settings.editorInputMode}
        scrollPastEnd={scrollPastEnd}
        selection={selectionState?.selection}
        scrollTo={selectionState?.scrollTo}
        onViewModeChange={onViewModeChange}
      />
    );
  }
};

type DocumentEditorProps = Omit<MarkdownContainerProps, 'object' | 'extensionProviders' | 'selection' | 'folding'> &
  Pick<MarkdownEditorProps, 'id' | 'scrollPastEnd' | 'extensions' | 'scrollTo' | 'selection'> & {
    document: DocumentType;
  };

export const DocumentEditor = ({ id, document: doc, settings, viewMode, ...props }: DocumentEditorProps) => {
  const space = getSpace(doc);

  // Migrate gradually to `fallbackName`.
  useEffect(() => {
    if (typeof doc.fallbackName === 'string') {
      return;
    }

    const fallbackName = doc.content?.target?.content ? getFallbackName(doc.content.target.content) : undefined;
    if (fallbackName) {
      doc.fallbackName = fallbackName;
    }
  }, [doc, doc.content]);

  // File dragging.
  const [upload] = useCapabilities(Capabilities.FileUploader);
  const handleFileUpload = useMemo(() => {
    if (space === undefined || upload === undefined) {
      return undefined;
    }

    // TODO(burdon): Re-order props: space, file.
    return async (file: File) => upload!(file, space);
  }, [space, upload]);

  return (
    <MarkdownEditor
      id={id}
      initialValue={doc.content?.target?.content}
      viewMode={viewMode}
      toolbar={settings.toolbar}
      inputMode={settings.editorInputMode}
      onFileUpload={handleFileUpload}
      {...props}
    />
  );
};

export default MarkdownContainer;
