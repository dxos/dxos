//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { Capabilities, useAppGraph, useCapabilities, usePluginManager } from '@dxos/app-framework';
import { Filter, Obj } from '@dxos/echo';
import { isInstanceOf, Query } from '@dxos/echo-schema';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { type CommandMenuGroup, type CommandMenuItem, insertAtCursor, insertAtLineStart } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';
import { useExtensions } from '../extensions';
import { DocumentType, type MarkdownSettingsProps } from '../types';
import { getFallbackName } from '../util';

export type MarkdownContainerProps = Pick<
  MarkdownEditorProps,
  'role' | 'extensionProviders' | 'viewMode' | 'editorStateStore' | 'onViewModeChange'
> & {
  id: string;
  object: DocumentType | DataType.Text | any;
  settings: MarkdownSettingsProps;
  selectionManager?: SelectionManager;
};

const MarkdownContainer = ({
  id,
  role,
  object,
  settings,
  selectionManager,
  viewMode,
  editorStateStore,
  onViewModeChange,
}: MarkdownContainerProps) => {
  const { t } = useTranslation();
  const scrollPastEnd = role === 'article';
  const doc = isInstanceOf(DocumentType, object) ? object : undefined;
  const text = isInstanceOf(DataType.Text, object) ? object : undefined;
  const extensions = useExtensions({ document: doc, text, id, settings, selectionManager, viewMode, editorStateStore });

  const manager = usePluginManager();
  const resolve = useCallback(
    (typename: string) =>
      manager.context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {},
    [manager],
  );

  const space = getSpace(object);
  const objectForms = useCapabilities(SpaceCapabilities.ObjectForm);
  const filter = useMemo(() => Filter.or(...objectForms.map((form) => Filter.type(form.objectSchema))), [objectForms]);
  const onLinkQuery = useCallback(
    async (query?: string): Promise<CommandMenuGroup[]> => {
      const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : query?.toLowerCase() ?? '';
      const results = await space?.db.query(Query.select(filter)).run();
      // TODO(wittjosiah): Use `Obj.Any` type.
      const getLabel = (object: any) => {
        const type = Obj.getTypename(object)!;
        const metadata = resolve(type);
        return (
          metadata.label?.(object) || object.name || ['object name placeholder', { ns: type, default: 'New object' }]
        );
      };
      const items =
        results?.objects
          .filter((object) => toLocalizedString(getLabel(object), t).toLowerCase().includes(name))
          // TODO(wittjosiah): Remove `any` type.
          .map((object: any): CommandMenuItem => {
            const metadata = resolve(Obj.getTypename(object)!);
            const label = toLocalizedString(getLabel(object), t);
            return {
              id: object.id,
              label,
              icon: metadata.icon,
              onSelect: (view, head) => {
                const link = `[${label}][${Obj.getDXN(object)}]`;
                if (query?.startsWith('@')) {
                  insertAtLineStart(view, head, `!${link}\n`);
                } else {
                  insertAtCursor(view, head, `${link} `);
                }
              },
            };
          }) ?? [];
      return [{ id: 'echo', items }];
    },
    [filter, resolve, space],
  );

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
        onViewModeChange={onViewModeChange}
        onLinkQuery={space ? onLinkQuery : undefined}
      />
    );
  } else if (text) {
    return (
      <MarkdownEditor
        id={id}
        role={role}
        initialValue={text.content}
        extensions={extensions}
        viewMode={viewMode}
        toolbar={settings.toolbar}
        inputMode={settings.editorInputMode}
        scrollPastEnd={scrollPastEnd}
        onViewModeChange={onViewModeChange}
        onLinkQuery={space ? onLinkQuery : undefined}
      />
    );
  } else {
    // TODO(burdon): Normalize with above.
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
        onViewModeChange={onViewModeChange}
        onLinkQuery={space ? onLinkQuery : undefined}
      />
    );
  }
};

type DocumentEditorProps = Omit<MarkdownContainerProps, 'object' | 'extensionProviders' | 'editorStateStore'> &
  Pick<MarkdownEditorProps, 'id' | 'scrollPastEnd' | 'extensions' | 'onLinkQuery'> & {
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

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Rx.make((get) => {
      const actions = get(graph.actions(id));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return { nodes, edges: nodes.map((node) => ({ source: 'root', target: node.id })) };
    });
  }, [graph]);

  return (
    <MarkdownEditor
      id={id}
      initialValue={doc.content?.target?.content}
      viewMode={viewMode}
      toolbar={settings.toolbar}
      customActions={customActions}
      inputMode={settings.editorInputMode}
      onFileUpload={handleFileUpload}
      {...props}
    />
  );
};

export default MarkdownContainer;
