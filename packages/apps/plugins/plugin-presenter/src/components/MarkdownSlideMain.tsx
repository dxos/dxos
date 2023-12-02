//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Container, Slide } from './Markdown';

export const MarkdownSlideMain: FC<{ slide: any }> = ({ slide }) => {
  return (
    <Container>
      <Slide content={String(slide.content)} />;
    </Container>
  );
};
