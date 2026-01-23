//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import {
  DialogClose as DialogClosePrimitive,
  type DialogCloseProps as DialogClosePrimitiveProps,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  type DialogDescriptionProps as DialogDescriptionPrimitiveProps,
  DialogOverlay as DialogOverlayPrimitive,
  type DialogOverlayProps as DialogOverlayPrimitiveProps,
  DialogPortal as DialogPortalPrimitive,
  type DialogPortalProps as DialogPortalPrimitiveProps,
  Root as DialogRootPrimitive,
  type DialogProps as DialogRootPrimitiveProps,
  DialogTitle as DialogTitlePrimitive,
  type DialogTitleProps as DialogTitlePrimitiveProps,
  DialogTrigger as DialogTriggerPrimitive,
  type DialogTriggerProps as DialogTriggerPrimitiveProps,
} from '@radix-ui/react-dialog';
import React, {
  type ComponentPropsWithRef,
  type ForwardRefExoticComponent,
  type FunctionComponent,
  forwardRef,
} from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type DialogRootProps = DialogRootPrimitiveProps;

const DialogRoot: FunctionComponent<DialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <DialogRootPrimitive {...props} />
  </ElevationProvider>
);

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
const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  DIALOG_OVERLAY_NAME,
  {},
);

type DialogOverlayProps = ThemedClassName<DialogOverlayPrimitiveProps & { blockAlign?: 'center' | 'start' | 'end' }>;

const DialogOverlay: ForwardRefExoticComponent<DialogOverlayProps> = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ classNames, children, blockAlign, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();

    return (
      <DialogOverlayPrimitive
        {...props}
        className={tx('dialog.overlay', 'dialog__overlay', {}, classNames)}
        ref={forwardedRef}
        data-block-align={blockAlign}
      >
        <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
      </DialogOverlayPrimitive>
    );
  },
);

DialogOverlay.displayName = DIALOG_OVERLAY_NAME;

type DialogContentProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContentPrimitive>> & {
  inOverlayLayout?: boolean;
};

const DialogContent: ForwardRefExoticComponent<DialogContentProps> = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, children, inOverlayLayout: propsInOverlayLayout, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { inOverlayLayout } = useOverlayLayoutContext(DIALOG_CONTENT_NAME);

    return (
      <DialogContentPrimitive
        // NOTE: Radix warning unless set to undefined.
        // https://www.radix-ui.com/primitives/docs/components/dialog#description
        aria-describedby={undefined}
        {...props}
        className={tx(
          'dialog.content',
          'dialog',
          { inOverlayLayout: propsInOverlayLayout || inOverlayLayout },
          classNames,
        )}
        ref={forwardedRef}
      >
        {children}
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
