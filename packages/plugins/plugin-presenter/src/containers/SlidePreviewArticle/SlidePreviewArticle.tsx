//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';
import * as Panel from '@dxos/react-ui/Panel';

import { Presentation } from '#types';

import { SlidePreview } from './SlidePreview.tsx';

export type SlidePreviewArticleProps = {
  role?: string;
  /** The slide being edited in the plank this companion belongs to. */
  subject: Presentation.Slide;
};

/**
 * The slide editor's companion: the rendered slide at full height beside its editor, following its cursor.
 */
export const SlidePreviewArticle = ({ role, subject: slide }: SlidePreviewArticleProps) => {
  const [content] = useObject(slide, 'content');
  const [loaded] = useObject(content);
  const text = loaded ? content.target : undefined;
  return (
    <Panel.Root role={role}>
      <Panel.Body classNames='flex'>
        {text && Presentation.isOwnedContent(slide, text) && <SlidePreview subject={text} />}
      </Panel.Body>
    </Panel.Root>
  );
};

SlidePreviewArticle.displayName = 'SlidePreviewArticle';
