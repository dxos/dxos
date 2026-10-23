//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Slide } from '#components';

export type SlideArticleProps = AppSurface.ObjectSectionProps<Markdown.Document>;

/** Unframed: `SlideRenderer` owns the scaled frame. */
export const SlideArticle = ({ subject: document }: SlideArticleProps) => {
  const [content] = useObject(document.content, 'content');
  if (!content) {
    return null;
  }

  return <Slide content={content} />;
};

SlideArticle.displayName = 'SlideArticle';
