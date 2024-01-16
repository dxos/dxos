//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Document as DocumentType } from '@braneframe/types';

import { Container, Slide } from './Markdown';

export const MarkdownSlideMain: FC<{ document: DocumentType }> = ({ document }) => {
  return (
    <Container>
      <Slide content={document.content.text} />;
    </Container>
  );
};
