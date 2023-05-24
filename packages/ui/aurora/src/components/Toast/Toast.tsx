//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import {
  ToastProvider as ToastProviderPrimitive,
  ToastProviderProps as ToastProviderPrimitiveProps,
  ToastViewport as ToastViewportPrimitive,
  ToastViewportProps as ToastViewportPrimitiveProps,
  Root as ToastRootPrimitive,
  ToastProps as ToastRootPrimitiveProps,
  ToastTitle as ToastTitlePrimitive,
  ToastTitleProps as ToastTitlePrimitiveProps,
  ToastDescription as ToastDescriptionPrimitive,
  ToastDescriptionProps as ToastDescriptionPrimitiveProps,
  ToastAction as ToastActionPrimitive,
  ToastActionProps as ToastActionPrimitiveProps,
  ToastClose as ToastClosePrimitive,
  ToastCloseProps as ToastClosePrimitiveProps,
} from '@radix-ui/react-toast';
import React, { ComponentPropsWithRef, forwardRef, FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';

type ToastProviderProps = ToastProviderPrimitiveProps;

const ToastProvider: FunctionComponent<ToastProviderProps> = ToastProviderPrimitive;

type ToastViewportProps = ThemedClassName<ToastViewportPrimitiveProps>;

const ToastViewport = forwardRef<HTMLOListElement, ToastViewportProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ToastViewportPrimitive className={tx('toast.viewport', 'toast-viewport', {}, classNames)} ref={forwardedRef} />
  );
});

type ToastRootProps = ThemedClassName<ToastRootPrimitiveProps>;

const ToastRoot = forwardRef<HTMLLIElement, ToastRootProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ToastRootPrimitive {...props} className={tx('toast.root', 'toast', {}, classNames)} ref={forwardedRef}>
      <ElevationProvider elevation='chrome'>
        <DensityProvider density='fine'>{children}</DensityProvider>
      </ElevationProvider>
    </ToastRootPrimitive>
  );
});

type ToastBodyProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>>;

const ToastBody = forwardRef<HTMLDivElement, ToastBodyProps>(({ asChild, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const Root = asChild ? Slot : Primitive.div;
  return <Root {...props} className={tx('toast.body', 'toast__body', {}, classNames)} ref={forwardedRef} />;
});

type ToastTitleProps = ThemedClassName<ToastTitlePrimitiveProps>;

const ToastTitle = forwardRef<HTMLHeadingElement, ToastTitleProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : ToastTitlePrimitive;
    return <Root {...props} className={tx('toast.title', 'toast__title', {}, classNames)} ref={forwardedRef} />;
  },
);

type ToastDescriptionProps = ThemedClassName<ToastDescriptionPrimitiveProps>;

const ToastDescription = forwardRef<HTMLParagraphElement, ToastDescriptionProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : ToastDescriptionPrimitive;
    return (
      <Root {...props} className={tx('toast.description', 'toast__description', {}, classNames)} ref={forwardedRef} />
    );
  },
);

type ToastActionsProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>>;

const ToastActions = forwardRef<HTMLDivElement, ToastActionsProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return <Root {...props} className={tx('toast.actions', 'toast__actions', {}, classNames)} ref={forwardedRef} />;
  },
);

type ToastActionProps = ToastActionPrimitiveProps;

const ToastAction: FunctionComponent<ToastActionProps> = ToastActionPrimitive;

type ToastCloseProps = ToastClosePrimitiveProps;

const ToastClose: FunctionComponent<ToastCloseProps> = ToastClosePrimitive;

export {
  ToastProvider,
  ToastViewport,
  ToastRoot,
  ToastBody,
  ToastTitle,
  ToastDescription,
  ToastActions,
  ToastAction,
  ToastClose,
};

export type {
  ToastProviderProps,
  ToastViewportProps,
  ToastRootProps,
  ToastBodyProps,
  ToastTitleProps,
  ToastDescriptionProps,
  ToastActionsProps,
  ToastActionProps,
  ToastCloseProps,
};
