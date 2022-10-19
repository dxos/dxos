//
// Copyright 2022 DXOS.org
//

import {
  Provider as TooltipProvider,
  TooltipProviderProps
} from '@radix-ui/react-tooltip';
import React, { PropsWithChildren } from 'react';

export type UiProviderProps = PropsWithChildren<{
  tooltipProviderProps?: TooltipProviderProps
}>

export const UiProvider = ({
  children,
  tooltipProviderProps
}: UiProviderProps) => {
  return (
    <TooltipProvider
      delayDuration={200}
      {...tooltipProviderProps}
    >
      {children}
    </TooltipProvider>
  );
};
