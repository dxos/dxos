//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Markdown } from '@dxos/plugin-markdown/types';

import { Container, Slide } from './Markdown';

type MarkdownSlideProps = {
  document: Markdown.Document;
};

const MarkdownSlide = ({ document }: MarkdownSlideProps) => {
  const content = document.content.target?.content;
  if (!content) {
    return null;
  }

  return (
    <Container>
      <Slide content={content} />
    </Container>
  );
};

export default MarkdownSlide;
