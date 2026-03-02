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
  type PropsWithChildren,
  forwardRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import { type DialogSize, osTranslations } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { Container } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { IconButton, type IconButtonProps } from '../Button';
import { ElevationProvider } from '../ElevationProvider';

//
// Root
//

type DialogRootProps = DialogRootPrimitiveProps;

const DialogRoot: FunctionComponent<DialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <DialogRootPrimitive {...props} />
  </ElevationProvider>
);

//
// Trigger
//

type DialogTriggerProps = DialogTriggerPrimitiveProps;

const DialogTrigger: FunctionComponent<DialogTriggerProps> = DialogTriggerPrimitive;

//
// Portal
//

type DialogPortalProps = DialogPortalPrimitiveProps;

const DialogPortal: FunctionComponent<DialogPortalProps> = DialogPortalPrimitive;

//
// Overlay
//

const DIALOG_OVERLAY_NAME = 'DialogOverlay';

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

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
        className={tx('dialog.overlay', {}, classNames)}
        ref={forwardedRef}
        data-h-align={blockAlign}
      >
        <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
      </DialogOverlayPrimitive>
    );
  },
);

DialogOverlay.displayName = DIALOG_OVERLAY_NAME;

//
// Content
//

const DIALOG_CONTENT_NAME = 'DialogContent';

type DialogContentProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContentPrimitive>> & {
  size?: DialogSize;
  inOverlayLayout?: boolean;
};

const DialogContent: ForwardRefExoticComponent<DialogContentProps> = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, children, size = 'md', inOverlayLayout: propsInOverlayLayout, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { inOverlayLayout } = useOverlayLayoutContext(DIALOG_CONTENT_NAME);

    return (
      <DialogContentPrimitive
        {...props}
        // NOTE: Radix warning unless set to undefined.
        // https://www.radix-ui.com/primitives/docs/components/dialog#description
        aria-describedby={undefined}
        className={tx('dialog.content', { inOverlayLayout: propsInOverlayLayout || inOverlayLayout, size }, classNames)}
        ref={forwardedRef}
      >
        <Container.Column>{children}</Container.Column>
      </DialogContentPrimitive>
    );
  },
);

DialogContent.displayName = DIALOG_CONTENT_NAME;

//
// Header
//

type DialogHeaderProps = ThemedClassName<PropsWithChildren> & { srOnly?: boolean };

const DialogHeader: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Container.Segment>
        <div role='header' {...props} className={tx('dialog.header', { srOnly }, [classNames])} ref={forwardedRef} />
      </Container.Segment>
    );
  },
);

//
// Body
//

type DialogBodyProps = PropsWithChildren;

const DialogBody: ForwardRefExoticComponent<DialogBodyProps> = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Container.Segment>
        <div role='none' {...props} className={tx('dialog.body')} ref={forwardedRef}>
          {children}
        </div>
      </Container.Segment>
    );
  },
);

//
// Title
//

type DialogTitleProps = ThemedClassName<DialogTitlePrimitiveProps> & { srOnly?: boolean };

const DialogTitle: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogTitlePrimitive {...props} className={tx('dialog.title', { srOnly }, classNames)} ref={forwardedRef} />
    );
  },
);

//
// Description
//

type DialogDescriptionProps = ThemedClassName<DialogDescriptionPrimitiveProps> & { srOnly?: boolean };

const DialogDescription: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <DialogDescriptionPrimitive
      {...props}
      className={tx('dialog.description', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

//
// ActionBar
//

type DialogActionBarProps = ThemedClassName<PropsWithChildren>;

const DialogActionBar: ForwardRefExoticComponent<DialogActionBarProps> = forwardRef<
  HTMLDivElement,
  DialogActionBarProps
>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <Container.Segment>
      <div {...props} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
        {children}
      </div>
    </Container.Segment>
  );
});

//
// Close
//

type DialogCloseProps = DialogClosePrimitiveProps;

const DialogClose: FunctionComponent<DialogCloseProps> = DialogClosePrimitive;

//
// Close Button
//

type DialogCloseIconButtonProps = ThemedClassName<Partial<IconButtonProps>>;

const DialogCloseIconButton: ForwardRefExoticComponent<DialogCloseIconButtonProps> = forwardRef<
  HTMLButtonElement,
  DialogCloseIconButtonProps
>((props, forwardedRef) => {
  const { t } = useTranslation(osTranslations);
  return (
    <IconButton
      {...props}
      label={props.label ?? t('close dialog label')}
      icon='ph--x--regular'
      iconOnly
      size={4}
      density='fine'
      variant='ghost'
      ref={forwardedRef}
    />
  );
});

//
// Dialog
//

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Title: DialogTitle,
  Description: DialogDescription,
  ActionBar: DialogActionBar,
  Close: DialogClose,
  CloseIconButton: DialogCloseIconButton,
};

export type {
  DialogRootProps,
  DialogTriggerProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogActionBarProps,
  DialogCloseProps,
  DialogCloseIconButtonProps,
};
