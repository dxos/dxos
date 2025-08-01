//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { ExtrinsicCardContainer, IntrinsicCardContainer, PopoverCardContainer } from '@dxos/storybook-utils';

import { Card } from '../exemplars';

export const CardContainer = ({
  children,
  icon = 'ph--placeholder--regular',
  role,
}: PropsWithChildren<{ icon?: string; role?: string }>) => {
  switch (role) {
    case 'card--popover':
      return <PopoverCardContainer icon={icon}>{children}</PopoverCardContainer>;

    case 'card--intrinsic':
      return (
        <IntrinsicCardContainer>
          <Card.StaticRoot>{children}</Card.StaticRoot>
        </IntrinsicCardContainer>
      );

    case 'card--extrinsic':
      return (
        <ExtrinsicCardContainer>
          <Card.StaticRoot>{children}</Card.StaticRoot>
        </ExtrinsicCardContainer>
      );

    default:
      return <Card.StaticRoot>{children}</Card.StaticRoot>;
  }
};
