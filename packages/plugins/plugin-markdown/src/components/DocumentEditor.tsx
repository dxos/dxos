//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { useResolvePlugin, parseFileManagerPlugin, useIntentDispatcher } from '@dxos/app-framework';
import { createDocAccessor, fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  createDataExtensions,
  listener,
  localStorageStateStoreAdapter,
  state,
  type Extension,
  type EditorSelectionState,
} from '@dxos/react-ui-editor';

import MarkdownEditor, { type MarkdownEditorProps } from './MarkdownEditor';
import { createBaseExtensions } from '../extensions';
import { type DocumentType, type MarkdownPluginState, type MarkdownSettingsProps } from '../types';
import { getFallbackName, setFallbackName } from '../util';

type DocumentEditorProps = {
  document: DocumentType;
  settings: MarkdownSettingsProps;
} & Omit<MarkdownEditorProps, 'id' | 'inputMode' | 'toolbar' | 'extensions'> &
  Pick<MarkdownPluginState, 'extensionProviders'>;

/**
 * Editor for a `DocumentType`.
 */
const DocumentEditor = ({
  document: doc,
  extensionProviders = [],
  viewMode,
  settings,
  ...props
}: DocumentEditorProps) => {
  const space = getSpace(doc);
  const identity = useIdentity();
  const dispatch = useIntentDispatcher();

  const baseExtensions = useMemo(() => {
    // TODO(wittjosiah): Autocomplete is not working and this query is causing performance issues.
    // const query = space?.db.query(Filter.schema(DocumentType));
    // query?.subscribe();
    return createBaseExtensions({
      viewMode,
      settings,
      document: doc,
      dispatch,
      // query,
    });
  }, [doc, viewMode, dispatch, settings, settings.folding, settings.numberedHeadings]);

  const providerExtensions = useMemo(
    () =>
      extensionProviders.reduce((acc: Extension[], provider) => {
        const provided = typeof provider === 'function' ? provider({ document: doc }) : provider;
        acc.push(...provided);
        return acc;
      }, []),
    [extensionProviders],
  );

  const extensions = useMemo(
    () => [
      // NOTE: Data extensions must be first so that automerge is updated before other extensions compute their state.
      createDataExtensions({
        id: doc.id,
        text: doc.content && createDocAccessor(doc.content, ['content']),
        space,
        identity,
      }),
      state(localStorageStateStoreAdapter),
      listener({
        onChange: (text) => {
          setFallbackName(doc, text);
        },
      }),
      providerExtensions,
      baseExtensions,
    ],
    [doc, doc.content, space, baseExtensions, providerExtensions, identity],
  );

  const initialValue = useMemo(() => doc.content?.content, [doc.content]);

  // Migrate gradually to `fallbackName`.
  useEffect(() => {
    if (!doc.fallbackName && doc.content?.content) {
      doc.fallbackName = getFallbackName(doc.content.content);
    }
  }, [doc, doc.content]);

  // Restore last selection and scroll point.
  const id = fullyQualifiedId(doc);
  const { scrollTo, selection } = useMemo<EditorSelectionState>(
    () => localStorageStateStoreAdapter.getState(id) ?? {},
    [doc],
  );

  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);
  const handleFileUpload = useMemo(() => {
    if (space === undefined) {
      return undefined;
    }

    if (fileManagerPlugin?.provides.file.upload === undefined) {
      return undefined;
    }

    return async (file: File) => {
      return fileManagerPlugin?.provides?.file?.upload?.(file, space);
    };
  }, [fileManagerPlugin, space]);

  return (
    <MarkdownEditor
      id={id}
      initialValue={initialValue}
      extensions={extensions}
      scrollTo={scrollTo}
      selection={selection}
      onFileUpload={handleFileUpload}
      inputMode={settings.editorInputMode}
      toolbar={settings.toolbar}
      viewMode={viewMode}
      {...props}
    />
  );
};

export default DocumentEditor;

export type DocumentEditor = typeof DocumentEditor;
