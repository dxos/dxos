//
// Copyright 2023 DXOS.org
//

import {
  AlertDialogProps as AlertDialogRootPrimitiveProps,
  Root as AlertDialogRootPrimitive,
  AlertDialogTrigger as AlertDialogTriggerPrimitive,
  AlertDialogTriggerProps as AlertDialogTriggerPrimitiveProps,
  AlertDialogPortal as AlertDialogPortalPrimitive,
  AlertDialogPortalProps as AlertDialogPortalPrimitiveProps,
  AlertDialogOverlay as AlertDialogOverlayPrimitive,
  AlertDialogOverlayProps as AlertDialogOverlayPrimitiveProps,
  AlertDialogTitle as AlertDialogTitlePrimitive,
  AlertDialogTitleProps as AlertDialogTitlePrimitiveProps,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  AlertDialogDescriptionProps as AlertDialogDescriptionPrimitiveProps,
  AlertDialogAction as AlertDialogActionPrimitive,
  AlertDialogActionProps as AlertDialogActionPrimitiveProps,
  AlertDialogCancel as AlertDialogCancelPrimitive,
  AlertDialogCancelProps as AlertDialogCancelPrimitiveProps,
  AlertDialogContent as AlertDialogContentPrimitive,
  AlertDialogContentProps as AlertDialogContentPrimitiveProps,
} from '@radix-ui/react-alert-dialog';
import { createContext } from '@radix-ui/react-context';
import React, { forwardRef, ForwardRefExoticComponent, FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type AlertDialogRootProps = AlertDialogRootPrimitiveProps;

const AlertDialogRoot: FunctionComponent<AlertDialogRootProps> = AlertDialogRootPrimitive;

type AlertDialogTriggerProps = AlertDialogTriggerPrimitiveProps;

const AlertDialogTrigger: FunctionComponent<AlertDialogTriggerProps> = AlertDialogTriggerPrimitive;

type AlertDialogPortalProps = AlertDialogPortalPrimitiveProps;

const AlertDialogPortal: FunctionComponent<AlertDialogPortalProps> = AlertDialogPortalPrimitive;

type AlertDialogCancelProps = AlertDialogCancelPrimitiveProps;

const AlertDialogCancel: FunctionComponent<AlertDialogCancelProps> = AlertDialogCancelPrimitive;

type AlertDialogActionProps = AlertDialogActionPrimitiveProps;

const AlertDialogAction: FunctionComponent<AlertDialogActionProps> = AlertDialogActionPrimitive;

type AlertDialogTitleProps = ThemedClassName<AlertDialogTitlePrimitiveProps> & { srOnly?: boolean };

const AlertDialogTitle: ForwardRefExoticComponent<AlertDialogTitleProps> = forwardRef<
  HTMLHeadingElement,
  AlertDialogTitleProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogTitlePrimitive
      {...(!srOnly && { tabIndex: 0 })}
      {...props}
      className={tx('dialog.title', 'dialog--alert__title', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

type AlertDialogDescriptionProps = ThemedClassName<AlertDialogDescriptionPrimitiveProps> & { srOnly?: boolean };

const AlertDialogDescription: ForwardRefExoticComponent<AlertDialogTitleProps> = forwardRef<
  HTMLParagraphElement,
  AlertDialogDescriptionProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogDescriptionPrimitive
      {...props}
      className={tx('dialog.description', 'dialog--alert__description', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };
const ALERT_DIALOG_OVERLAY_NAME = 'AlertDialogOverlay';
const ALERT_DIALOG_CONTENT_NAME = 'AlertDialogContent';
const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  ALERT_DIALOG_OVERLAY_NAME,
  {
    inOverlayLayout: false,
  },
);

type AlertDialogOverlayProps = ThemedClassName<AlertDialogOverlayPrimitiveProps>;

const AlertDialogOverlay: ForwardRefExoticComponent<AlertDialogOverlayProps> = forwardRef<
  HTMLDivElement,
  AlertDialogOverlayProps
>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogOverlayPrimitive
      {...props}
      className={tx('dialog.overlay', 'dialog--alert__overlay', {}, classNames)}
      ref={forwardedRef}
    >
      <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
    </AlertDialogOverlayPrimitive>
  );
});

AlertDialogOverlay.displayName = ALERT_DIALOG_OVERLAY_NAME;

type AlertDialogContentProps = ThemedClassName<AlertDialogContentPrimitiveProps>;

const AlertDialogContent: ForwardRefExoticComponent<AlertDialogContentProps> = forwardRef<
  HTMLDivElement,
  AlertDialogContentProps
>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { inOverlayLayout } = useOverlayLayoutContext(ALERT_DIALOG_CONTENT_NAME);
  return (
    <AlertDialogContentPrimitive
      {...props}
      className={tx('dialog.content', 'dialog--alert', { inOverlayLayout }, classNames)}
      ref={forwardedRef}
    >
      <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
    </AlertDialogContentPrimitive>
  );
});

AlertDialogContent.displayName = ALERT_DIALOG_CONTENT_NAME;

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
};

export type {
  AlertDialogRootProps,
  AlertDialogTriggerProps,
  AlertDialogPortalProps,
  AlertDialogOverlayProps,
  AlertDialogContentProps,
  AlertDialogTitleProps,
  AlertDialogDescriptionProps,
  AlertDialogCancelProps,
  AlertDialogActionProps,
};
