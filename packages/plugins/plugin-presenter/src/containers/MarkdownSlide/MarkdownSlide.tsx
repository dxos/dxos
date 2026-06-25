//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Markdown } from '@dxos/plugin-markdown';

import { Panel, Slide } from '#components';

type MarkdownSlideProps = {
  document: Markdown.Document;
};

export const MarkdownSlide = ({ document }: MarkdownSlideProps) => {
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
