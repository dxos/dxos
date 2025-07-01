//
// Copyright 2022 DXOS.org
//

import React, { PropsWithChildren } from 'react';
import { DocsContainer as BaseContainer, DocsContainerProps } from '@storybook/blocks';

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
