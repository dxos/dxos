//
// Copyright 2022 DXOS.org
//

import { DocsContainer as BaseContainer, type DocsContainerProps } from '@storybook/blocks';
import React, { type PropsWithChildren } from 'react';

/**
 * https://storybook.js.org/docs/writing-docs/doc-blocks
 */
export const DocsContainer = ({ children, context, theme }: PropsWithChildren<DocsContainerProps>) => {
  return (
    <BaseContainer context={context} theme={theme}>
      {children}
    </BaseContainer>
  );
};
