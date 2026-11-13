//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';

import { EmbedAncestor, MarkdownSlide, Slide } from '#components';

export type SlideArticleProps = AppSurface.ObjectSectionProps<Markdown.Document>;

/** Unframed: `Slide.Frame` owns the scaled frame. */
export const SlideArticle = ({ subject: document }: SlideArticleProps) => {
  const [content] = useObject(document.content, 'content');
  // Space-relative refs in the document resolve against the document's own database.
  const renderSurface = Slide.useSurfaceRenderer(Obj.getDatabase(document));
  if (!content) {
    return null;
  }

  // The document is an ancestor of its own embeds, so one that embeds itself renders a placeholder, not a loop.
  return (
    <EmbedAncestor id={document.id}>
      <MarkdownSlide content={content} renderSurface={renderSurface} />
    </EmbedAncestor>
  );
};

SlideArticle.displayName = 'SlideArticle';
