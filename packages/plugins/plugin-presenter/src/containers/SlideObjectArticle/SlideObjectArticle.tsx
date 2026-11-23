//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { useObject } from '@dxos/echo-react';

import { Presentation } from '#types';

import { SlideEditorArticle } from '../SlideEditorArticle/SlideEditorArticle.tsx';
import { SlidePreviewArticle } from '../SlidePreviewArticle/SlidePreviewArticle.tsx';

export type SlideObjectArticleProps = AppSurface.ObjectArticleProps<Presentation.Slide>;

/**
 * A read-only host shows the slide's preview instead.
 */
export const SlideObjectArticle = ({ role, subject: slide, attendableId }: SlideObjectArticleProps) => {
  const readOnly = ToolkitHooks.useReadOnly();
  const [content] = useObject(slide, 'content');
  // Subscribe to the content's load through its snapshot, but hand on the live object, which editors need.
  const [loaded] = useObject(content);
  const target = loaded ? content.target : undefined;
  if (readOnly) {
    return <SlidePreviewArticle role={role} subject={slide} />;
  }
  if (!target) {
    return null;
  }
  if (Presentation.isOwnedContent(slide, target)) {
    return <SlideEditorArticle role={role} subject={target} attendableId={attendableId} />;
  }
  return <Surface.Surface type={AppSurface.Article} data={{ subject: target, attendableId }} limit={1} />;
};

SlideObjectArticle.displayName = 'SlideObjectArticle';
