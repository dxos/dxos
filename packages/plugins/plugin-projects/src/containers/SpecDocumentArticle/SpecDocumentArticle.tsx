//
// Copyright 2026 DXOS.org
//

import { useAtomSet } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import React, { useId, useMemo, useState } from 'react';

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
import { useDefaultSpecView, useSpecExtensions, useSpecFieldExtensions, useSpecToolbar } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import * as SpecSession from '../../SpecSession.ts';

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
  const specExtensions = useSpecExtensions(subject, { attendableId, t, binding });
  const fieldExtensions = useSpecFieldExtensions(subject, binding);
  const defaultView = useDefaultSpecView();
  const [viewMode, setViewMode] = useState<EditorViewMode>(defaultView);
  // The companion's views follow this editor's cursor and move it to a block, as they do plugin-code's spec editor.
  const setCursor = useAtomSet(SpecSession.cursor(subject.id));
  const owner = useId();
  const extensions = useMemo(
    () => [...specExtensions, SpecSession.editor(subject.id, owner, setCursor)],
    [specExtensions, subject.id, owner, setCursor],
  );

  return (
    <Editor.Root viewMode={viewMode}>
      <Panel.Root role={role}>
        <SpecDocumentToolbar attendableId={attendableId} onViewModeChange={setViewMode} />
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
 * section is drawn in), such as commenting. A host with a toolbar of its own takes them instead, and the section has no
 * header.
 */
const SpecDocumentToolbar = ({
  attendableId,
  onViewModeChange,
}: {
  attendableId?: string;
  onViewModeChange: (mode: EditorViewMode) => void;
}) => {
  const { controller } = useEditorContext('SpecDocumentToolbar');
  const hosted = useSpecToolbar({ attendableId, onViewModeChange });
  const { graph } = ToolkitHooks.useAppGraph();
  const customActions = useMemo(
    () =>
      attendableId
        ? Atom.make((get) => graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        : undefined,
    [graph, attendableId],
  );

  // The toolbar's actions act on the editor, so it waits for the editor to mount.
  return !hosted && controller?.view ? (
    <Panel.Header>
      <Editor.Toolbar
        classNames='dx-document'
        attendableId={attendableId}
        customActions={customActions}
        onViewModeChange={onViewModeChange}
      />
    </Panel.Header>
  ) : null;
};
