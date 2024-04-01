//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { getTextContent } from '@dxos/react-client/echo';

import { Container, Slide } from './Markdown';

const MarkdownSlideMain: FC<{ document: DocumentType }> = ({ document }) => {
  const content = getTextContent(document.content);
  if (!content) {
    return null;
  }

  return (
    <Container>
      <Slide content={content} />;
    </Container>
  );
};

export default MarkdownSlideMain;
