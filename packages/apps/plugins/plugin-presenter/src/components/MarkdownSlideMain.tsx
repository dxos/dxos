//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Container, Slide } from './Markdown';

export const MarkdownSlideMain: FC<{ data: any }> = ({ data }) => {
  return (
    <Container>
      <Slide content={String(data.content)} />;
    </Container>
  );
};
