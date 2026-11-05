//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Spec from '@dxos/compute/Spec';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';
import { useSpecExtensions } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/**
 * A spec's `.mdl` text: the section a spec's Document view embeds. It draws object links and embeds and takes the
 * extensions other plugins give Markdown documents, such as diagrams. Each of the spec's packages adds its own editing,
 * such as the software package's features synced to the spec, and its slash commands.
 */
export const SpecDocumentArticle = ({ role, subject, attendableId }: SpecDocumentArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const extensions = useSpecExtensions(subject, { attendableId, t });

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <SpecDocumentEditor
          spec={subject}
          extensions={extensions}
          classNames='h-full'
          data-testid='spec-document.editor'
        />
      </Panel.Body>
    </Panel.Root>
  );
};
