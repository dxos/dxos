//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AttendableContainer, type AttendableContainerProps } from '@dxos/react-ui-attention';

import { KeyboardContainer } from './KeyboardContainer';

export const Container = ({ id, children, ...props }: AttendableContainerProps) => (
  <AttendableContainer {...props} id={id} tabIndex={0}>
    <KeyboardContainer id={id}>{children}</KeyboardContainer>
  </AttendableContainer>
);
