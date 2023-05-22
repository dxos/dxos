//
// Copyright 2023 DXOS.org
//

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

type DialogTitleProps = DialogTitlePrimitiveProps;

const DialogTitle: FunctionComponent<DialogTitleProps> = DialogTitlePrimitive;

type DialogDescriptionProps = DialogDescriptionPrimitiveProps;

const DialogDescription: FunctionComponent<DialogDescriptionProps> = DialogDescriptionPrimitive;

type DialogCloseProps = DialogClosePrimitiveProps;

const DialogClose: FunctionComponent<DialogCloseProps> = DialogClosePrimitive;

type DialogOverlayProps = ThemedClassName<DialogOverlayPrimitiveProps>;

const DialogOverlay: ForwardRefExoticComponent<DialogOverlayProps> = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogOverlayPrimitive
        {...props}
        className={tx('dialog.overlay', 'dialog__overlay', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DialogContentProps = ThemedClassName<DialogContentPrimitiveProps>;

const DialogContent: ForwardRefExoticComponent<DialogContentProps> = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogContentPrimitive {...props} className={tx('dialog.content', 'dialog', {}, classNames)} ref={forwardedRef}>
        <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
      </DialogContentPrimitive>
    );
  },
);

export {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
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
