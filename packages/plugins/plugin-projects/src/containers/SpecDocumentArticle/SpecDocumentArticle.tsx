//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Spec from '@dxos/compute/Spec';
import { useObject } from '@dxos/echo-react';
import { Editor, useCommentActions, useEditorContext } from '@dxos/react-ui-editor';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { ProjectCapabilities } from '#types';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/**
 * A spec's `.mdl` text: the section a spec's Document view embeds, with the editing its extension packages give, such as
 * the software package's feature sections, synced to the spec, and each package's slash commands. A spec with no
 * packages is plain text.
 */
export const SpecDocumentArticle = ({ role, subject, attendableId }: SpecDocumentArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const factories = Hooks.useCapabilities(ProjectCapabilities.SpecExtensions);
  // Rebuilt when the spec takes or drops a package, whose editing then comes or goes.
  const [dialects] = useObject(subject, 'dialects');
  const extensions = useMemo(
    () => factories.flatMap((factory) => factory(subject, { attendableId, dialects, t })),
    [factories, subject, attendableId, dialects, t],
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

/** The editor's formatting toolbar and, while another plugin adds comments to the editor, its comment action. */
const SpecDocumentToolbar = ({ attendableId }: { attendableId?: string }) => {
  const { controller } = useEditorContext('SpecDocumentToolbar');
  const customActions = useCommentActions();

  // The toolbar's actions act on the editor, so it waits for the editor to mount.
  return controller?.view ? (
    <Editor.Toolbar classNames='dx-document' attendableId={attendableId} customActions={customActions} />
  ) : null;
};
