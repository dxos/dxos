//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Capabilities, Surface, useAppGraph, useCapabilities, usePluginManager } from '@dxos/app-framework';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { useClient } from '@dxos/react-client';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type SelectionManager } from '@dxos/react-ui-attention';
import {
  type PopoverMenuGroup,
  type PopoverMenuItem,
  type PreviewLinkRef,
  type PreviewOptions,
  insertAtCursor,
  insertAtLineStart,
} from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import { useExtensions } from '../extensions';
import { Markdown } from '../types';
import { getFallbackName } from '../util';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';

export type MarkdownContainerProps = Pick<
  MarkdownEditorProps,
  'role' | 'extensionProviders' | 'viewMode' | 'editorStateStore' | 'onViewModeChange'
> & {
  id: string;
  object: Markdown.Document | DataType.Text | any;
  settings: Markdown.Settings;
  selectionManager?: SelectionManager;
};

export const MarkdownContainer = ({
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
  const document = Obj.instanceOf(Markdown.Document, object) ? object : undefined;
  const text = Obj.instanceOf(DataType.Text, object) ? object : undefined;
  const [previewBlocks, setPreviewBlocks] = useState<{ link: PreviewLinkRef; el: HTMLElement }[]>([]);
  const previewOptions = useMemo(
    (): PreviewOptions => ({
      addBlockContainer: (link, el) => {
        setPreviewBlocks((prev) => [...prev, { link, el }]);
      },
      removeBlockContainer: (link) => {
        setPreviewBlocks((prev) => prev.filter(({ link: prevLink }) => prevLink.ref !== link.ref));
      },
    }),
    [],
  );

  const extensions = useExtensions({
    id,
    document,
    text,
    settings,
    selectionManager,
    viewMode,
    editorStateStore,
    previewOptions,
  });

  // TODO(wittjosiah): Factor out.
  const manager = usePluginManager();
  const resolve = useCallback(
    (typename: string) =>
      manager.context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {},
    [manager],
  );
  const space = getSpace(object);
  const objectForms = useCapabilities(SpaceCapabilities.ObjectForm);
  const schemaWhiteList = useCapabilities(ClientCapabilities.SchemaWhiteList);
  const filter = useMemo(
    () =>
      Filter.or(
        ...objectForms.map((form) => Filter.type(form.objectSchema)),
        ...schemaWhiteList.flat().map((schema) => Filter.typename(Type.getTypename(schema))),
      ),
    [objectForms, schemaWhiteList],
  );

  const handleLinkQuery = useCallback(
    async (query?: string): Promise<PopoverMenuGroup[]> => {
      const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : (query?.toLowerCase() ?? '');
      const results = await space?.db.query(Query.select(filter)).run();
      // TODO(wittjosiah): Use `Obj.Any` type.
      const getLabel = (object: any) => {
        const label = Obj.getLabel(object);
        if (label) {
          return label;
        }

        // TODO(wittjosiah): Remove metadata labels.
        const type = Obj.getTypename(object)!;
        const metadata = resolve(type);
        return metadata.label?.(object) || ['object name placeholder', { ns: type, default: 'New object' }];
      };
      const items =
        results?.objects
          .filter((object) => toLocalizedString(getLabel(object), t).toLowerCase().includes(name))
          // TODO(wittjosiah): Remove `any` type.
          .map((object: any): PopoverMenuItem => {
            const metadata = resolve(Obj.getTypename(object)!);
            const label = toLocalizedString(getLabel(object), t);
            return {
              id: object.id,
              label,
              icon: metadata.icon,
              onSelect: (view, head) => {
                const link = `[${label}](${Obj.getDXN(object)})`;
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

  // TODO(burdon): Reconcile variants.
  const editor = document ? (
    <DocumentEditor
      id={fullyQualifiedId(object)}
      role={role}
      document={document}
      extensions={extensions}
      viewMode={viewMode}
      settings={settings}
      scrollPastEnd={scrollPastEnd}
      onViewModeChange={onViewModeChange}
      onLinkQuery={space ? handleLinkQuery : undefined}
    />
  ) : text ? (
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
      onLinkQuery={space ? handleLinkQuery : undefined}
    />
  ) : (
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
      onLinkQuery={space ? handleLinkQuery : undefined}
    />
  );

  return (
    <>
      {editor}
      {previewBlocks.map(({ link, el }) => (
        <PreviewBlock key={link.ref} link={link} el={el} />
      ))}
    </>
  );
};

// TODO(wittjosiah): This shouldn't be "card" but "block".
//   It's not a preview card but an interactive embedded object.
const PreviewBlock = ({ link, el }: { link: PreviewLinkRef; el: HTMLElement }) => {
  const client = useClient();
  const dxn = DXN.parse(link.ref);
  const subject = client.graph.ref(dxn).target;
  const data = useMemo(() => ({ subject }), [subject]);

  return createPortal(<Surface role='card--transclusion' data={data} limit={1} />, el);
};

type DocumentEditorProps = Omit<MarkdownContainerProps, 'object' | 'extensionProviders' | 'editorStateStore'> &
  Pick<MarkdownEditorProps, 'id' | 'scrollPastEnd' | 'extensions' | 'onLinkQuery'> & {
    document: Markdown.Document;
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
