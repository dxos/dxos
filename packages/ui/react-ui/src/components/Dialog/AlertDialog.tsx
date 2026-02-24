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
import React, {
  type ForwardRefExoticComponent,
  type FunctionComponent,
  type PropsWithChildren,
  forwardRef,
} from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

//
// Root
//

type AlertDialogRootProps = AlertDialogRootPrimitiveProps;

const AlertDialogRoot: FunctionComponent<AlertDialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <AlertDialogRootPrimitive {...props} />
  </ElevationProvider>
);

//
// Trigger
//

type AlertDialogTriggerProps = AlertDialogTriggerPrimitiveProps;

const AlertDialogTrigger: FunctionComponent<AlertDialogTriggerProps> = AlertDialogTriggerPrimitive;

//
// Portal
//

type AlertDialogPortalProps = AlertDialogPortalPrimitiveProps;

const AlertDialogPortal: FunctionComponent<AlertDialogPortalProps> = AlertDialogPortalPrimitive;

//
// Cancel
//

type AlertDialogCancelProps = AlertDialogCancelPrimitiveProps;

const AlertDialogCancel: FunctionComponent<AlertDialogCancelProps> = AlertDialogCancelPrimitive;

//
// Action
//

type AlertDialogActionProps = AlertDialogActionPrimitiveProps;

const AlertDialogAction: FunctionComponent<AlertDialogActionProps> = AlertDialogActionPrimitive;

//
// Title
//

type AlertDialogTitleProps = ThemedClassName<AlertDialogTitlePrimitiveProps> & { srOnly?: boolean };

const AlertDialogTitle: ForwardRefExoticComponent<AlertDialogTitleProps> = forwardRef<
  HTMLHeadingElement,
  AlertDialogTitleProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogTitlePrimitive {...props} className={tx('dialog.title', { srOnly }, classNames)} ref={forwardedRef} />
  );
});

//
// Description
//

type AlertDialogDescriptionProps = ThemedClassName<AlertDialogDescriptionPrimitiveProps> & { srOnly?: boolean };

const AlertDialogDescription: ForwardRefExoticComponent<AlertDialogTitleProps> = forwardRef<
  HTMLParagraphElement,
  AlertDialogDescriptionProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogDescriptionPrimitive
      {...props}
      className={tx('dialog.description', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

//
// Context
//

const ALERT_DIALOG_OVERLAY_NAME = 'AlertDialogOverlay';
const ALERT_DIALOG_CONTENT_NAME = 'AlertDialogContent';
const ALERT_DIALOG_ACTIONBAR_NAME = 'AlertDialogActionBar';

const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  ALERT_DIALOG_OVERLAY_NAME,
  {
    inOverlayLayout: false,
  },
);

//
// Overlay
//

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
        {},
        classNames,
        'data-[h-align=start]:justify-center',
        'data-[h-align=start]:items-start',
        'data-[h-align=center]:place-content-center',
      )}
      ref={forwardedRef}
      data-h-align={blockAlign}
    >
      <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
    </AlertDialogOverlayPrimitive>
  );
});

AlertDialogOverlay.displayName = ALERT_DIALOG_OVERLAY_NAME;

//
// Content
//

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
      className={tx('dialog.content', { inOverlayLayout }, classNames)}
      ref={forwardedRef}
    >
      {children}
    </AlertDialogContentPrimitive>
  );
});

AlertDialogContent.displayName = ALERT_DIALOG_CONTENT_NAME;

//
// ActionBar
//

type AlertDialogActionBarProps = ThemedClassName<PropsWithChildren>;

const AlertDialogActionBar: ForwardRefExoticComponent<AlertDialogActionBarProps> = forwardRef<
  HTMLDivElement,
  AlertDialogActionBarProps
>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
      {children}
    </div>
  );
});

AlertDialogActionBar.displayName = ALERT_DIALOG_ACTIONBAR_NAME;

//
// AlertDialog
//

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  ActionBar: AlertDialogActionBar,
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
  AlertDialogActionBarProps,
  AlertDialogCancelProps,
  AlertDialogActionProps,
};
