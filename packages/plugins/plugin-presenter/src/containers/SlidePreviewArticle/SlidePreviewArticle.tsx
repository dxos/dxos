//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Panel from '@dxos/react-ui/Panel';
import { type Text } from '@dxos/schema';

import { SlidePreview } from './SlidePreview.tsx';

export type SlidePreviewArticleProps = {
  role?: string;
  /** The slide being edited in the plank this companion belongs to. */
  subject: Text.Text;
};

/**
 * The slide editor's companion: the rendered slide at full height beside its editor, following its cursor.
 */
export const SlidePreviewArticle = ({ role, subject }: SlidePreviewArticleProps) => (
  <Panel.Root role={role}>
    <Panel.Body classNames='flex'>
      <SlidePreview subject={subject} />
    </Panel.Body>
  </Panel.Root>
);

SlidePreviewArticle.displayName = 'SlidePreviewArticle';
