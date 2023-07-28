//
// Copyright 2023 DXOS.org
//

import {
  Root as PopoverRootPrimitive,
  PopoverProps as PopoverRootPrimitiveProps,
  PopoverContentProps as PopoverContentPrimitiveProps,
  PopoverContent as PopoverContentPrimitive,
  PopoverTriggerProps as PopoverTriggerPrimitiveProps,
  PopoverTrigger as PopoverTriggerPrimitive,
  PopoverAnchorProps as PopoverAnchorPrimitiveProps,
  PopoverAnchor as PopoverAnchorPrimitive,
  PopoverPortalProps as PopoverPortalPrimitiveProps,
  PopoverPortal as PopoverPortalPrimitive,
  PopoverArrowProps as PopoverArrowPrimitiveProps,
  PopoverArrow as PopoverArrowPrimitive,
  PopoverCloseProps as PopoverClosePrimitiveProps,
  PopoverClose as PopoverClosePrimitive,
} from '@radix-ui/react-popover';
import React, { forwardRef, FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type PopoverRootProps = PopoverRootPrimitiveProps;

const PopoverRoot: FunctionComponent<PopoverRootProps> = PopoverRootPrimitive;

type PopoverPortalProps = PopoverPortalPrimitiveProps;

const PopoverPortal = PopoverPortalPrimitive;

type PopoverTriggerProps = PopoverTriggerPrimitiveProps;

const PopoverTrigger = PopoverTriggerPrimitive;

type PopoverAnchorProps = PopoverAnchorPrimitiveProps;

const PopoverAnchor = PopoverAnchorPrimitive;

type PopoverCloseProps = PopoverClosePrimitiveProps;

const PopoverClose = PopoverClosePrimitive;

type PopoverArrowProps = ThemedClassName<PopoverArrowPrimitiveProps>;

const PopoverArrow = forwardRef<SVGSVGElement, PopoverArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <PopoverArrowPrimitive
      {...props}
      className={tx('popover.arrow', 'popover__arrow', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

type PopoverContentProps = ThemedClassName<PopoverContentPrimitiveProps>;

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <PopoverContentPrimitive
      {...props}
      className={tx('popover.content', 'popover', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

export const Popover = {
  Root: PopoverRoot,
  Portal: PopoverPortal,
  Trigger: PopoverTrigger,
  Anchor: PopoverAnchor,
  Arrow: PopoverArrow,
  Close: PopoverClose,
  Content: PopoverContent,
};

export type {
  PopoverRootProps,
  PopoverPortalProps,
  PopoverTriggerProps,
  PopoverAnchorProps,
  PopoverArrowProps,
  PopoverCloseProps,
  PopoverContentProps,
};
