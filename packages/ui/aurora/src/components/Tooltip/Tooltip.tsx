//
// Copyright 2023 DXOS.org
//

import {
  Provider as TooltipProviderPrimitive,
  TooltipProviderProps as TooltipProviderPrimitiveProps
} from '@radix-ui/react-tooltip';
import { FunctionComponent } from 'react';

type TooltipProviderProps = TooltipProviderPrimitiveProps;

const TooltipProvider: FunctionComponent<TooltipProviderProps> = TooltipProviderPrimitive;

export { TooltipProvider };

export type { TooltipProviderProps };
