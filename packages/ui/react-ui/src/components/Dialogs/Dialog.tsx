//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import {
  type DialogProps as DialogRootPrimitiveProps,
  Root as DialogRootPrimitive,
  DialogTrigger as DialogTriggerPrimitive,
  type DialogTriggerProps as DialogTriggerPrimitiveProps,
  DialogPortal as DialogPortalPrimitive,
  type DialogPortalProps as DialogPortalPrimitiveProps,
  DialogOverlay as DialogOverlayPrimitive,
  type DialogOverlayProps as DialogOverlayPrimitiveProps,
  DialogTitle as DialogTitlePrimitive,
  type DialogTitleProps as DialogTitlePrimitiveProps,
  DialogDescription as DialogDescriptionPrimitive,
  type DialogDescriptionProps as DialogDescriptionPrimitiveProps,
  DialogClose as DialogClosePrimitive,
  type DialogCloseProps as DialogClosePrimitiveProps,
  DialogContent as DialogContentPrimitive,
  type DialogContentProps as DialogContentPrimitiveProps,
} from '@radix-ui/react-dialog';
import React, { forwardRef, type ForwardRefExoticComponent, type FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
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

type DialogOverlayProps = ThemedClassName<DialogOverlayPrimitiveProps> & { blockAlign?: 'center' | 'start' };

const DialogOverlay: ForwardRefExoticComponent<DialogOverlayProps> = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ classNames, children, blockAlign, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();

    return (
      <DialogOverlayPrimitive
        {...props}
        className={tx(
          'dialog.overlay',
          'dialog__overlay',
          {},
          classNames,
          'data-[block-align=start]:justify-center',
          'data-[block-align=start]:items-start',
          'data-[block-align=center]:place-content-center',
        )}
        ref={forwardedRef}
        data-block-align={blockAlign}
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
