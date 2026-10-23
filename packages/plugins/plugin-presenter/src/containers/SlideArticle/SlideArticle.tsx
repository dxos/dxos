//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';

import { MarkdownSlide, useSurfaceRenderer } from '#components';

export type SlideArticleProps = AppSurface.ObjectSectionProps<Markdown.Document>;

/** Unframed: `SlideRenderer` owns the scaled frame. */
export const SlideArticle = ({ subject: document }: SlideArticleProps) => {
  const [content] = useObject(document.content, 'content');
  // Space-relative refs in the document resolve against the document's own database.
  const renderSurface = useSurfaceRenderer(Obj.getDatabase(document));
  if (!content) {
    return null;
  }

  return <MarkdownSlide content={content} renderSurface={renderSurface} />;
};

SlideArticle.displayName = 'SlideArticle';
