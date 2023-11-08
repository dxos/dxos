//
// Copyright 2023 DXOS.org
//

import {
  Root as PopoverRootPrimitive,
  type PopoverProps as PopoverRootPrimitiveProps,
  type PopoverContentProps as PopoverContentPrimitiveProps,
  PopoverContent as PopoverContentPrimitive,
  type PopoverTriggerProps as PopoverTriggerPrimitiveProps,
  PopoverTrigger as PopoverTriggerPrimitive,
  type PopoverAnchorProps as PopoverAnchorPrimitiveProps,
  PopoverAnchor as PopoverAnchorPrimitive,
  type PopoverPortalProps as PopoverPortalPrimitiveProps,
  PopoverPortal as PopoverPortalPrimitive,
  type PopoverArrowProps as PopoverArrowPrimitiveProps,
  PopoverArrow as PopoverArrowPrimitive,
  type PopoverCloseProps as PopoverClosePrimitiveProps,
  PopoverClose as PopoverClosePrimitive,
} from '@radix-ui/react-popover';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef, type FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

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

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <PopoverContentPrimitive
        sideOffset={4}
        collisionPadding={8}
        {...props}
        className={tx('popover.content', 'popover', {}, classNames)}
        ref={forwardedRef}
      >
        <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
      </PopoverContentPrimitive>
    );
  },
);

type PopoverViewportProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
  constrainInline?: boolean;
  constrainBlock?: boolean;
};

const PopoverViewport = forwardRef<HTMLDivElement, PopoverViewportProps>(
  ({ classNames, asChild, constrainInline = true, constrainBlock = true, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        {...props}
        className={tx('popover.viewport', 'popover__viewport', { constrainInline, constrainBlock }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

export const Popover = {
  Root: PopoverRoot,
  Portal: PopoverPortal,
  Trigger: PopoverTrigger,
  Anchor: PopoverAnchor,
  Arrow: PopoverArrow,
  Close: PopoverClose,
  Content: PopoverContent,
  Viewport: PopoverViewport,
};

export type {
  PopoverRootProps,
  PopoverPortalProps,
  PopoverTriggerProps,
  PopoverAnchorProps,
  PopoverArrowProps,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverViewportProps,
};
