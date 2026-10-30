//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { type SpecDocument } from '@dxos/types';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { featureEmbedExtensions } from './feature-embed-extensions.tsx';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<SpecDocument.SpecDocument>;

/**
 * A spec's `.mdl` document: the section a spec's Document view embeds, and the article for a document no richer plugin
 * renders. A spec's document is canonical for the features it holds, each embedded as its editable section, so edits that add,
 * take out, move or paste embeds are synced to the spec.
 */
export const SpecDocumentArticle = ({ role, subject, attendableId }: SpecDocumentArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const newName = t('feature-map.new-feature.name');
  const extensions = useMemo(
    () => featureEmbedExtensions(subject, { attendableId, newName }),
    [subject, attendableId, newName],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <SpecDocumentEditor
          document={subject}
          extensions={extensions}
          classNames='h-full'
          data-testid='spec-document.editor'
        />
      </Panel.Body>
    </Panel.Root>
  );
};
