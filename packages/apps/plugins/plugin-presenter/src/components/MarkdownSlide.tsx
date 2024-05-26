//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';

import { Container, Slide } from './Markdown';

const MarkdownSlide: FC<{ document: DocumentType }> = ({ document }) => {
  const content = document.content?.content;
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
