//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import type * as Spec from '@dxos/compute/Spec';
import { useResolveRef } from '@dxos/echo-react';
import { Editor, useEditorContext } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';
import { useSpecExtensions, useSpecFieldExtensions } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/**
 * A spec's `.mdl` text, its blocks drawn as forms unless the toolbar switches it to source: the section a spec's
 * Document view embeds. It draws object links and embeds and takes the
 * extensions other plugins give Markdown documents, such as diagrams. Each of the spec's packages adds its own editing,
 * such as the software package's features synced to the spec, and its slash commands.
 */
export const SpecDocumentArticle = ({ role, subject, attendableId }: SpecDocumentArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  // The spec's text, which comments on the document anchor into.
  const text = useResolveRef(subject.content);
  const binding = useMemo(() => (text ? { object: text, path: ['content'] } : undefined), [text]);
  const extensions = useSpecExtensions(subject, { attendableId, t, binding });
  const fieldExtensions = useSpecFieldExtensions(subject, binding);
  const [viewMode, setViewMode] = useState<EditorViewMode>('preview');

  return (
    <Editor.Root viewMode={viewMode}>
      <Panel.Root role={role}>
        <Panel.Header>
          <SpecDocumentToolbar attendableId={attendableId} onViewModeChange={setViewMode} />
        </Panel.Header>
        <Panel.Body>
          <SpecDocumentEditor
            spec={subject}
            extensions={extensions}
            fieldExtensions={fieldExtensions}
            viewMode={viewMode}
            classNames='h-full'
            data-testid='spec-document.editor'
          />
        </Panel.Body>
      </Panel.Root>
    </Editor.Root>
  );
};

/**
 * The editor's formatting toolbar, with the toolbar actions other plugins give the attended node (the project the
 * section is drawn in), such as commenting.
 */
const SpecDocumentToolbar = ({
  attendableId,
  onViewModeChange,
}: {
  attendableId?: string;
  onViewModeChange: (mode: EditorViewMode) => void;
}) => {
  const { controller } = useEditorContext('SpecDocumentToolbar');
  const { graph } = ToolkitHooks.useAppGraph();
  const customActions = useMemo(
    () =>
      attendableId
        ? Atom.make((get) => graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        : undefined,
    [graph, attendableId],
  );

  // The toolbar's actions act on the editor, so it waits for the editor to mount.
  return controller?.view ? (
    <Editor.Toolbar
      classNames='dx-document'
      attendableId={attendableId}
      customActions={customActions}
      onViewModeChange={onViewModeChange}
    />
  ) : null;
};
