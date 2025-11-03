//
// Copyright 2023 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type PanelContainerProps = ThemedClassName<
  PropsWithChildren<{
    toolbar?: JSX.Element;
    footer?: JSX.Element;
  }>
>;

export const PanelContainer = ({ classNames, children, toolbar, footer }: PanelContainerProps) => (
  <div className='flex flex-col bs-full overflow-hidden divide-y divide-separator'>
    {toolbar}
    <div className={mx('flex flex-col bs-full overflow-auto', classNames)}>{children}</div>
    {footer}
  </div>
);
