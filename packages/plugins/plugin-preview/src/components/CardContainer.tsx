//
// Copyright 2025 DXOS.org
//

import React, { Fragment, type PropsWithChildren } from 'react';

import { Card } from '@dxos/react-ui-stack';

export const CardContainer = ({ role, children }: PropsWithChildren<{ role: string }>) => {
  const Root = role === 'popover' ? 'div' : role === 'card--kanban' ? Fragment : Card.Content;
  const rootProps = role === 'popover' ? { className: 'popover-card-width' } : {};
  console.log('[card container]', role, rootProps);
  return <Root {...rootProps}>{children}</Root>;
};
