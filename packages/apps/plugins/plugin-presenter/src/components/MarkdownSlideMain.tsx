//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Document as DocumentType } from '@braneframe/types';

import { Container, Slide } from './Markdown';

const MarkdownSlideMain: FC<{ document: DocumentType }> = ({ document }) => {
  return (
    <Container>
      {/* TODO: content is a YText object, but should be a string. Update after automerge migration. */}
      <Slide content={document.content.content as any} />;
    </Container>
  );
};

export default MarkdownSlideMain;
