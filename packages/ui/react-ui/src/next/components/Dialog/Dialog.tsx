//
// Copyright 2026 DXOS.org
//

import { Dialog as DialogPrimitive } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import React, { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Container } from '../Container/index.ts';
import { Group } from '../Group/index.ts';
import { IconButton } from '../IconButton/index.ts';
import { ScrollArea, type ScrollAreaRootProps } from '../ScrollArea/index.ts';

//
// Root
//

type DialogRootProps = DialogPrimitive.RootProps;

/** Ark dialog; content mounts on first open and unmounts on close unless the caller opts out. */
const DialogRoot = ({ lazyMount = true, unmountOnExit = true, ...props }: DialogRootProps) => (
  <DialogPrimitive.Root {...props} lazyMount={lazyMount} unmountOnExit={unmountOnExit} />
);

DialogRoot.displayName = 'Next.Dialog.Root';

//
// Trigger
//

type DialogTriggerProps = DialogPrimitive.TriggerProps;

/** Use `asChild` to open the dialog from a `Next.Button`. */
const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>((props, forwardedRef) => (
  <DialogPrimitive.Trigger {...props} ref={forwardedRef} />
));

DialogTrigger.displayName = 'Next.Dialog.Trigger';

//
// Content
//

type DialogContentProps = ThemedClassName<DialogPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size. */
  size?: Size;
};

/** Portalled surface at `level='raised'` over a scrim, centred in the viewport: a column of Header, Body and Footer. */
const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, size = 'md', children, ...props }, forwardedRef) => (
    <Portal>
      <DialogPrimitive.Backdrop className={recipes.dialogBackdrop()} />
      <DialogPrimitive.Positioner className={recipes.dialogPositioner()}>
        <DialogPrimitive.Content
          {...props}
          data-surface='raised'
          data-size={size}
          className={mx(recipes.dialogContent(), classNames)}
          ref={forwardedRef}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Positioner>
    </Portal>
  ),
);

DialogContent.displayName = 'Next.Dialog.Content';

//
// Header
//

type DialogHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A block row holding the Title and an optional trailing CloseTrigger. */
const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='dialog'
    data-part='header'
    className={mx(recipes.dialogHeader(), classNames)}
    ref={forwardedRef}
  />
));

DialogHeader.displayName = 'Next.Dialog.Header';

//
// Title
//

type DialogTitleProps = ThemedClassName<DialogPrimitive.TitleProps>;

const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(({ classNames, ...props }, forwardedRef) => (
  <DialogPrimitive.Title {...props} className={mx(recipes.dialogTitle(), classNames)} ref={forwardedRef} />
));

DialogTitle.displayName = 'Next.Dialog.Title';

//
// Description
//

type DialogDescriptionProps = ThemedClassName<DialogPrimitive.DescriptionProps>;

const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <DialogPrimitive.Description
      {...props}
      className={mx(recipes.dialogDescription(), classNames)}
      ref={forwardedRef}
    />
  ),
);

DialogDescription.displayName = 'Next.Dialog.Description';

//
// CloseTrigger
//

type DialogCloseTriggerProps = Omit<DialogPrimitive.CloseTriggerProps, 'children'> & {
  /** With `asChild`, the child (e.g. a Cancel `Next.Button`) closes the dialog instead of the default icon button. */
  children?: ReactNode;
  icon?: string;
  label?: string;
};

const DialogCloseTrigger = forwardRef<HTMLButtonElement, DialogCloseTriggerProps>(
  ({ asChild, children, icon = 'ph--x--regular', label = 'Close', ...props }, forwardedRef) =>
    asChild ? (
      <DialogPrimitive.CloseTrigger {...props} asChild ref={forwardedRef}>
        {children}
      </DialogPrimitive.CloseTrigger>
    ) : (
      <DialogPrimitive.CloseTrigger {...props} asChild ref={forwardedRef}>
        <IconButton icon={icon} label={label} />
      </DialogPrimitive.CloseTrigger>
    ),
);

DialogCloseTrigger.displayName = 'Next.Dialog.CloseTrigger';

//
// Body
//

type DialogBodyProps = ThemedClassName<Pick<ScrollAreaRootProps, 'mode' | 'width' | 'native'>> & {
  children?: ReactNode;
};

/**
 * Composed scroll (decision 5): a `gutter='md'` Container as the viewport, so the thumb sits in the end gutter.
 * The element carries ScrollArea's `data-scope`, since parts cannot rescope a composed child (finding 10).
 */
const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(({ classNames, children, ...props }, forwardedRef) => (
  <ScrollArea.Root {...props} classNames={mx(recipes.dialogBody(), classNames)} ref={forwardedRef}>
    <ScrollArea.Viewport asChild>
      <Container gutter='md'>{children}</Container>
    </ScrollArea.Viewport>
  </ScrollArea.Root>
));

DialogBody.displayName = 'Next.Dialog.Body';

//
// Footer
//

type DialogFooterProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** An end-justified `Next.Group` of actions; the child div wins the merge, so the part keeps the dialog scope. */
const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(({ classNames, ...props }, forwardedRef) => (
  <Group asChild justify='end'>
    <div
      {...props}
      data-scope='dialog'
      data-part='footer'
      className={mx(recipes.dialogFooter(), classNames)}
      ref={forwardedRef}
    />
  </Group>
));

DialogFooter.displayName = 'Next.Dialog.Footer';

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Header: DialogHeader,
  Title: DialogTitle,
  Description: DialogDescription,
  CloseTrigger: DialogCloseTrigger,
  Body: DialogBody,
  Footer: DialogFooter,
};

export type {
  DialogBodyProps,
  DialogCloseTriggerProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
};
