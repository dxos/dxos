//
// Copyright 2023 DXOS.org
//

import {
  AlertDialogAction as AlertDialogActionPrimitive,
  type AlertDialogActionProps as AlertDialogActionPrimitiveProps,
  AlertDialogCancel as AlertDialogCancelPrimitive,
  type AlertDialogCancelProps as AlertDialogCancelPrimitiveProps,
  AlertDialogContent as AlertDialogContentPrimitive,
  type AlertDialogContentProps as AlertDialogContentPrimitiveProps,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  type AlertDialogDescriptionProps as AlertDialogDescriptionPrimitiveProps,
  AlertDialogOverlay as AlertDialogOverlayPrimitive,
  type AlertDialogOverlayProps as AlertDialogOverlayPrimitiveProps,
  AlertDialogPortal as AlertDialogPortalPrimitive,
  type AlertDialogPortalProps as AlertDialogPortalPrimitiveProps,
  Root as AlertDialogRootPrimitive,
  type AlertDialogProps as AlertDialogRootPrimitiveProps,
  AlertDialogTitle as AlertDialogTitlePrimitive,
  type AlertDialogTitleProps as AlertDialogTitlePrimitiveProps,
  AlertDialogTrigger as AlertDialogTriggerPrimitive,
  type AlertDialogTriggerProps as AlertDialogTriggerPrimitiveProps,
} from '@radix-ui/react-alert-dialog';
import { createContext } from '@radix-ui/react-context';
import React, { type ForwardRefExoticComponent, type FunctionComponent, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type AlertDialogRootProps = AlertDialogRootPrimitiveProps;

const AlertDialogRoot: FunctionComponent<AlertDialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <AlertDialogRootPrimitive {...props} />
  </ElevationProvider>
);

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

type AlertDialogOverlayProps = ThemedClassName<AlertDialogOverlayPrimitiveProps> & {
  blockAlign?: 'center' | 'start' | 'end';
};

const AlertDialogOverlay: ForwardRefExoticComponent<AlertDialogOverlayProps> = forwardRef<
  HTMLDivElement,
  AlertDialogOverlayProps
>(({ classNames, children, blockAlign, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogOverlayPrimitive
      {...props}
      className={tx(
        'dialog.overlay',
        'dialog--alert__overlay',
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
      {children}
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
