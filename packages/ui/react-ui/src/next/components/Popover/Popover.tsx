//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { Popover as PopoverPrimitive, usePopoverContext } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import React, { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { IconButton } from '../IconButton/index.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

//
// Root
//

type PopoverRootProps = PopoverPrimitive.RootProps;

/** Ark popover; content mounts on open and unmounts on close unless the caller opts out. */
const PopoverRoot = ({ lazyMount = true, unmountOnExit = true, positioning, ...props }: PopoverRootProps) => (
  <PopoverPrimitive.Root
    {...props}
    lazyMount={lazyMount}
    unmountOnExit={unmountOnExit}
    // Ark's 8px default reads as detached from the trigger.
    positioning={{ gutter: POPUP_GUTTER, ...positioning }}
  />
);

PopoverRoot.displayName = 'Next.Popover.Root';

//
// Trigger
//

type PopoverTriggerProps = PopoverPrimitive.TriggerProps;

/** Use `asChild` to open the popover from a `Next.Button` or `Next.IconButton`. */
const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>((props, forwardedRef) => (
  <PopoverPrimitive.Trigger {...props} ref={forwardedRef} />
));

PopoverTrigger.displayName = 'Next.Popover.Trigger';

//
// Anchor
//

type PopoverAnchorProps = PopoverPrimitive.AnchorProps;

/** Positions the content against this element instead of the trigger. */
const PopoverAnchor = forwardRef<HTMLDivElement, PopoverAnchorProps>((props, forwardedRef) => (
  <PopoverPrimitive.Anchor {...props} ref={forwardedRef} />
));

PopoverAnchor.displayName = 'Next.Popover.Anchor';

//
// Content
//

type PopoverContentProps = ThemedClassName<PopoverPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size. */
  size?: Size;
};

/** Portalled panel at `level='popup'`, padded by the size's gap. */
const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ classNames, size = 'md', children, ...props }, forwardedRef) => (
    <Portal>
      <PopoverPrimitive.Positioner>
        <PopoverPrimitive.Content
          {...props}
          data-surface='popup'
          data-size={size}
          className={mx(recipes.popup(), recipes.popoverContent(), classNames)}
          ref={forwardedRef}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Positioner>
    </Portal>
  ),
);

PopoverContent.displayName = 'Next.Popover.Content';

//
// Header
//

type PopoverHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A block row holding the Title and an optional trailing CloseTrigger. */
const PopoverHeader = forwardRef<HTMLDivElement, PopoverHeaderProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='popover'
    data-part='header'
    className={mx(recipes.popoverHeader(), classNames)}
    ref={forwardedRef}
  />
));

PopoverHeader.displayName = 'Next.Popover.Header';

//
// Title
//

type PopoverTitleProps = ThemedClassName<PopoverPrimitive.TitleProps>;

const PopoverTitle = forwardRef<HTMLHeadingElement, PopoverTitleProps>(({ classNames, ...props }, forwardedRef) => (
  <PopoverPrimitive.Title {...props} className={mx(recipes.popoverTitle(), classNames)} ref={forwardedRef} />
));

PopoverTitle.displayName = 'Next.Popover.Title';

//
// Description
//

type PopoverDescriptionProps = ThemedClassName<PopoverPrimitive.DescriptionProps>;

const PopoverDescription = forwardRef<HTMLParagraphElement, PopoverDescriptionProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <PopoverPrimitive.Description
      {...props}
      className={mx(recipes.popoverDescription(), classNames)}
      ref={forwardedRef}
    />
  ),
);

PopoverDescription.displayName = 'Next.Popover.Description';

//
// CloseTrigger
//

type PopoverCloseTriggerProps = Omit<PopoverPrimitive.CloseTriggerProps, 'children'> & {
  /** With `asChild`, the child (e.g. a `Next.Button`) closes the popover instead of the default icon button. */
  children?: ReactNode;
  icon?: string;
  label?: string;
};

const PopoverCloseTrigger = forwardRef<HTMLButtonElement, PopoverCloseTriggerProps>(
  ({ asChild, children, icon = 'ph--x--regular', label = 'Close', onClick, ...props }, forwardedRef) => {
    const popover = usePopoverContext();
    // zag's close trigger sets `aria-label="close"`, which would rename a child with its own text (e.g. "Done").
    return asChild ? (
      <ark.button
        {...props}
        asChild
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            popover.setOpen(false);
          }
        }}
        ref={forwardedRef}
      >
        {children}
      </ark.button>
    ) : (
      <PopoverPrimitive.CloseTrigger {...props} onClick={onClick} asChild ref={forwardedRef}>
        <IconButton icon={icon} label={label} />
      </PopoverPrimitive.CloseTrigger>
    );
  },
);

PopoverCloseTrigger.displayName = 'Next.Popover.CloseTrigger';

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Anchor: PopoverAnchor,
  Content: PopoverContent,
  Header: PopoverHeader,
  Title: PopoverTitle,
  Description: PopoverDescription,
  CloseTrigger: PopoverCloseTrigger,
};

export type {
  PopoverAnchorProps,
  PopoverCloseTriggerProps,
  PopoverContentProps,
  PopoverDescriptionProps,
  PopoverHeaderProps,
  PopoverRootProps,
  PopoverTitleProps,
  PopoverTriggerProps,
};
