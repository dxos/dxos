//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type FlexProps = ThemedClassName<
  PropsWithChildren<{
    column?: boolean;
  }>
>;

// TODO(burdon): Move to react-ui.
export const Flex = ({ classNames, children, column }: FlexProps) => {
  return (
    <div role='none' className={mx('flex', column && 'flex-col', classNames)}>
      {children}
    </div>
  );
};
