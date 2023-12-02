//
// Copyright 2023 DXOS.org
//

import {
  Provider as TooltipProviderPrimitive,
  type TooltipProviderProps as TooltipProviderPrimitiveProps,
  Root as TooltipRootPrimitive,
  type TooltipProps as TooltipRootPrimitiveProps,
  type TooltipContentProps as TooltipContentPrimitiveProps,
  TooltipContent as TooltipContentPrimitive,
  type TooltipTriggerProps as TooltipTriggerPrimitiveProps,
  TooltipTrigger as TooltipTriggerPrimitive,
  type TooltipPortalProps as TooltipPortalPrimitiveProps,
  TooltipPortal as TooltipPortalPrimitive,
  type TooltipArrowProps as TooltipArrowPrimitiveProps,
  TooltipArrow as TooltipArrowPrimitive,
} from '@radix-ui/react-tooltip';
import React, { forwardRef, type FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type TooltipProviderProps = TooltipProviderPrimitiveProps;

const TooltipProvider: FunctionComponent<TooltipProviderProps> = TooltipProviderPrimitive;

type TooltipRootProps = TooltipRootPrimitiveProps;

const TooltipRoot: FunctionComponent<TooltipRootProps> = TooltipRootPrimitive;

type TooltipPortalProps = TooltipPortalPrimitiveProps;

const TooltipPortal = TooltipPortalPrimitive;

type TooltipTriggerProps = TooltipTriggerPrimitiveProps;

const TooltipTrigger = TooltipTriggerPrimitive;

type TooltipArrowProps = ThemedClassName<TooltipArrowPrimitiveProps>;

const TooltipArrow = forwardRef<SVGSVGElement, TooltipArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <TooltipArrowPrimitive
      {...props}
      className={tx('tooltip.arrow', 'tooltip__arrow', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

type TooltipContentProps = ThemedClassName<TooltipContentPrimitiveProps>;

const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <TooltipContentPrimitive
      sideOffset={4}
      collisionPadding={8}
      {...props}
      className={tx('tooltip.content', 'tooltip', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Portal: TooltipPortal,
  Trigger: TooltipTrigger,
  Arrow: TooltipArrow,
  Content: TooltipContent,
};

export type {
  TooltipProviderProps,
  TooltipRootProps,
  TooltipPortalProps,
  TooltipTriggerProps,
  TooltipArrowProps,
  TooltipContentProps,
};
