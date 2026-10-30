//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Spec from '@dxos/compute/Spec';
import { useObject } from '@dxos/echo-react';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { FeatureMap } from '#types';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { featureEmbedExtensions } from './feature-embed-extensions.tsx';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/**
 * A spec's `.mdl` text: the section a spec's Document view embeds. The text is canonical for the features the spec
 * holds, each embedded as its editable section, so edits that add, take out, move or paste embeds are synced to the
 * spec. A spec not in the features dialect is plain text.
 */
export const SpecDocumentArticle = ({ role, subject, attendableId }: SpecDocumentArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const newName = t('feature-map.new-feature.name');
  const [dialects] = useObject(subject, 'dialects');
  const features = FeatureMap.usesDialect({ dialects });
  const extensions = useMemo(
    () => (features ? featureEmbedExtensions(subject, { attendableId, newName }) : []),
    [subject, features, attendableId, newName],
  );

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
