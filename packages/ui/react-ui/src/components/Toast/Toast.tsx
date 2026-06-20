//
// Copyright 2023 DXOS.org
//

import * as ToastPrimitive from '@radix-ui/react-toast';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks';
import { DensityProvider, ElevationProvider } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { Column } from '../Column';
import { Icon } from '../Icon';

//
// Provider
//

type ToastProviderProps = ToastPrimitive.ToastProviderProps;

const ToastProvider = ToastPrimitive.Provider;

//
// Viewport
//

type ToastViewportProps = ThemedClassName<ToastPrimitive.ToastViewportProps>;

const ToastViewport = forwardRef<HTMLOListElement, ToastViewportProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <ToastPrimitive.Viewport {...props} className={tx('toast.viewport', {}, classNames)} ref={forwardedRef} />;
});

ToastViewport.displayName = 'Toast.Viewport';

//
// Root
//

type ToastRootProps = ThemedClassName<ToastPrimitive.ToastProps>;

const ToastRoot = forwardRef<HTMLLIElement, ToastRootProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ToastPrimitive.Root {...props} className={tx('toast.root', {}, classNames)} ref={forwardedRef}>
      <ElevationProvider elevation='toast'>
        <Column.Root classNames={tx('toast.grid', {})}>{children}</Column.Root>
      </ElevationProvider>
    </ToastPrimitive.Root>
  );
});

ToastRoot.displayName = 'Toast.Root';

//
// Title
//

type ToastTitleProps = ThemedClassName<ToastPrimitive.ToastTitleProps> & {
  icon?: string;
  onClose?: () => void;
};

const ToastTitle = forwardRef<HTMLHeadingElement, ToastTitleProps>(
  ({ classNames, children, icon, onClose, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { tx } = useThemeContext();
    return (
      <Column.Row classNames={tx('toast.header', {})}>
        {icon && (
          <Column.Block>
            <Icon icon={icon} size={5} />
          </Column.Block>
        )}
        <ToastPrimitive.Title {...props} className={tx('toast.title', {}, classNames)} ref={forwardedRef}>
          {children}
        </ToastPrimitive.Title>
        {onClose && (
          <Column.Block end>
            <IconButton
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('toolbar-close.label')}
              onClick={onClose}
            />
          </Column.Block>
        )}
      </Column.Row>
    );
  },
);

ToastTitle.displayName = 'Toast.Title';

//
// Description
//

type ToastDescriptionProps = ThemedClassName<ToastPrimitive.ToastDescriptionProps>;

const ToastDescription = forwardRef<HTMLParagraphElement, ToastDescriptionProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ToastPrimitive.Description {...props} className={tx('toast.description', {}, classNames)} ref={forwardedRef}>
        {children}
      </ToastPrimitive.Description>
    );
  },
);

ToastDescription.displayName = 'Toast.Description';

//
// Actions
//

type ToastActionsProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const ToastActions = forwardRef<HTMLDivElement, ToastActionsProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Column.Center classNames={tx('toast.actions', {}, classNames)} ref={forwardedRef} {...props}>
        <DensityProvider density='sm'>{children}</DensityProvider>
      </Column.Center>
    );
  },
);

ToastActions.displayName = 'Toast.Actions';

//
// Action / Close
//

type ToastActionProps = ToastPrimitive.ToastActionProps;

const ToastAction = ToastPrimitive.Action;

type ToastCloseProps = ToastPrimitive.ToastCloseProps;

const ToastClose = ToastPrimitive.Close;

//
// Toast
//

export const Toast = {
  Provider: ToastProvider,
  Viewport: ToastViewport,
  Root: ToastRoot,
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
  ToastTitleProps,
  ToastDescriptionProps,
  ToastActionsProps,
  ToastActionProps,
  ToastCloseProps,
};
