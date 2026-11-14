//
// Copyright 2026 DXOS.org
//

import { useAtomSet } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import React, { useId, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import type * as Spec from '@dxos/compute/Spec';
import { useResolveRef } from '@dxos/echo-react';
import { Editor, useEditorContext } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';
import { useSpecExtensions } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import * as SpecSession from '../../SpecSession.ts';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/**
 * A spec's `.mdl` text: the section a spec's Document view embeds. It draws object links and embeds and takes the
 * extensions other plugins give Markdown documents, such as diagrams. Each of the spec's packages adds its own editing,
 * such as the software package's features synced to the spec, and its slash commands.
 */
export const SpecDocumentArticle = ({ role, subject, attendableId }: SpecDocumentArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  // The spec's text, which comments on the document anchor into.
  const text = useResolveRef(subject.content);
  const binding = useMemo(() => (text ? { object: text, path: ['content'] } : undefined), [text]);
  const specExtensions = useSpecExtensions(subject, { attendableId, t, binding });
  // The companion's views follow this editor's cursor and move it to a block, as they do plugin-code's spec editor.
  const setCursor = useAtomSet(SpecSession.cursor(subject.id));
  const owner = useId();
  const extensions = useMemo(
    () => [...specExtensions, SpecSession.editor(subject.id, owner, setCursor)],
    [specExtensions, subject.id, owner, setCursor],
  );

  return (
    <Editor.Root>
      <Panel.Root role={role}>
        <Panel.Header>
          <SpecDocumentToolbar attendableId={attendableId} />
        </Panel.Header>
        <Panel.Body>
          <SpecDocumentEditor
            spec={subject}
            extensions={extensions}
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
const SpecDocumentToolbar = ({ attendableId }: { attendableId?: string }) => {
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
    <Editor.Toolbar classNames='dx-document' attendableId={attendableId} customActions={customActions} />
  ) : null;
};
