//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Spec from '@dxos/compute/Spec';
import { useObject } from '@dxos/echo-react';
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
