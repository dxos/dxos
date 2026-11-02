//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Panel from '@dxos/react-ui/Panel';
import { type SpecDocument } from '@dxos/types';

import { SpecDocumentEditor } from '../../components/SpecDocumentEditor/index.ts';

export type SpecDocumentArticleProps = AppSurface.ObjectArticleProps<SpecDocument.SpecDocument>;

/**
 * A spec's `.mdl` document as plain text: the section a spec's Document view embeds, and the article for a document
 * no richer plugin renders.
 */
export const SpecDocumentArticle = ({ role, subject }: SpecDocumentArticleProps) => (
  <Panel.Root role={role}>
    <Panel.Body>
      <SpecDocumentEditor document={subject} classNames='h-full' data-testid='spec-document.editor' />
    </Panel.Body>
  </Panel.Root>
);
