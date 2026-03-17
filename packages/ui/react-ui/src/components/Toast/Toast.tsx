//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import * as ToastPrimitive from '@radix-ui/react-toast';
import React, { type ComponentPropsWithRef, type FunctionComponent, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type ToastProviderProps = ToastPrimitive.ToastProviderProps;

const ToastProvider: FunctionComponent<ToastProviderProps> = ToastPrimitive.Provider;

type ToastViewportProps = ThemedClassName<ToastPrimitive.ToastViewportProps>;

const ToastViewport = forwardRef<HTMLOListElement, ToastViewportProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <ToastPrimitive.Viewport className={tx('toast.viewport', {}, classNames)} ref={forwardedRef} />;
});

type ToastRootProps = ThemedClassName<ToastPrimitive.ToastProps>;

const ToastRoot = forwardRef<HTMLLIElement, ToastRootProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ToastPrimitive.Root {...props} className={tx('toast.root', {}, classNames)} ref={forwardedRef}>
      <ElevationProvider elevation='toast'>{children}</ElevationProvider>
    </ToastPrimitive.Root>
  );
});

type ToastBodyProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>>;

const ToastBody = forwardRef<HTMLDivElement, ToastBodyProps>(({ asChild, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const Comp = asChild ? Slot : Primitive.div;
  return <Comp {...props} className={tx('toast.body', {}, classNames)} ref={forwardedRef} />;
});

type ToastTitleProps = ThemedClassName<ToastPrimitive.ToastTitleProps>;

const ToastTitle = forwardRef<HTMLHeadingElement, ToastTitleProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : ToastPrimitive.Title;
    return <Comp {...props} className={tx('toast.title', {}, classNames)} ref={forwardedRef} />;
  },
);

type ToastDescriptionProps = ThemedClassName<ToastPrimitive.ToastDescriptionProps>;

const ToastDescription = forwardRef<HTMLParagraphElement, ToastDescriptionProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : ToastPrimitive.Description;
    return <Comp {...props} className={tx('toast.description', {}, classNames)} ref={forwardedRef} />;
  },
);

type ToastActionsProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>>;

const ToastActions = forwardRef<HTMLDivElement, ToastActionsProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return <Comp {...props} className={tx('toast.actions', {}, classNames)} ref={forwardedRef} />;
  },
);

type ToastActionProps = ToastPrimitive.ToastActionProps;

const ToastAction: FunctionComponent<ToastActionProps> = ToastPrimitive.Action;

type ToastCloseProps = ToastPrimitive.ToastCloseProps;

const ToastClose: FunctionComponent<ToastCloseProps> = ToastPrimitive.Close;

export const Toast = {
  Provider: ToastProvider,
  Viewport: ToastViewport,
  Root: ToastRoot,
  Body: ToastBody,
  Title: ToastTitle,
  Description: ToastDescription,
  Actions: ToastActions,
  Action: ToastAction,
  Close: ToastClose,
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
