//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Markdown } from '@dxos/plugin-markdown';

import { Panel, Slide } from '#components';

export type SlideArticleProps = AppSurface.ObjectSectionProps<Markdown.Document>;

export const SlideArticle = ({ subject: document }: SlideArticleProps) => {
  const content = document.content.target?.content;
  if (!content) {
    return null;
  }

  return (
    <Panel classNames='border'>
      <Slide content={content} />
    </Panel>
  );
};

SlideArticle.displayName = 'SlideArticle';
