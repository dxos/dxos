//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import {
  DialogProps as DialogRootPrimitiveProps,
  Root as DialogRootPrimitive,
  DialogTrigger as DialogTriggerPrimitive,
  DialogTriggerProps as DialogTriggerPrimitiveProps,
  DialogPortal as DialogPortalPrimitive,
  DialogPortalProps as DialogPortalPrimitiveProps,
  DialogOverlay as DialogOverlayPrimitive,
  DialogOverlayProps as DialogOverlayPrimitiveProps,
  DialogTitle as DialogTitlePrimitive,
  DialogTitleProps as DialogTitlePrimitiveProps,
  DialogDescription as DialogDescriptionPrimitive,
  DialogDescriptionProps as DialogDescriptionPrimitiveProps,
  DialogClose as DialogClosePrimitive,
  DialogCloseProps as DialogClosePrimitiveProps,
  DialogContent as DialogContentPrimitive,
  DialogContentProps as DialogContentPrimitiveProps,
} from '@radix-ui/react-dialog';
import React, { forwardRef, ForwardRefExoticComponent, FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type DialogRootProps = DialogRootPrimitiveProps;

const DialogRoot: FunctionComponent<DialogRootProps> = DialogRootPrimitive;

type DialogTriggerProps = DialogTriggerPrimitiveProps;

const DialogTrigger: FunctionComponent<DialogTriggerProps> = DialogTriggerPrimitive;

type DialogPortalProps = DialogPortalPrimitiveProps;

const DialogPortal: FunctionComponent<DialogPortalProps> = DialogPortalPrimitive;

type DialogTitleProps = ThemedClassName<DialogTitlePrimitiveProps> & { srOnly?: boolean };

const DialogTitle: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogTitlePrimitive
        {...(!srOnly && { tabIndex: 0 })}
        {...props}
        className={tx('dialog.title', 'dialog__title', { srOnly }, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DialogDescriptionProps = ThemedClassName<DialogDescriptionPrimitiveProps> & { srOnly?: boolean };

const DialogDescription: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <DialogDescriptionPrimitive
      {...props}
      className={tx('dialog.description', 'dialog__description', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

type DialogCloseProps = DialogClosePrimitiveProps;

const DialogClose: FunctionComponent<DialogCloseProps> = DialogClosePrimitive;

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };
const DIALOG_OVERLAY_NAME = 'DialogOverlay';
const DIALOG_CONTENT_NAME = 'DialogContent';
const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(DIALOG_OVERLAY_NAME, {
  inOverlayLayout: false,
});

type DialogOverlayProps = ThemedClassName<DialogOverlayPrimitiveProps>;

const DialogOverlay: ForwardRefExoticComponent<DialogOverlayProps> = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogOverlayPrimitive
        {...props}
        className={tx('dialog.overlay', 'dialog__overlay', {}, classNames)}
        ref={forwardedRef}
      >
        <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
      </DialogOverlayPrimitive>
    );
  },
);

DialogOverlay.displayName = DIALOG_OVERLAY_NAME;

type DialogContentProps = ThemedClassName<DialogContentPrimitiveProps>;

const DialogContent: ForwardRefExoticComponent<DialogContentProps> = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { inOverlayLayout } = useOverlayLayoutContext(DIALOG_CONTENT_NAME);
    return (
      <DialogContentPrimitive
        {...props}
        className={tx('dialog.content', 'dialog', { inOverlayLayout }, classNames)}
        ref={forwardedRef}
      >
        <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
      </DialogContentPrimitive>
    );
  },
);

DialogContent.displayName = DIALOG_CONTENT_NAME;

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};

export type {
  DialogRootProps,
  DialogTriggerProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogCloseProps,
};
