//
// Copyright 2022 DXOS.org
//

import { X } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { ComponentProps, ReactNode } from 'react';

import {
  DialogClose,
  DialogCloseProps,
  DialogContent,
  DialogContentProps,
  DialogDescription,
  DialogDescriptionProps,
  DialogOverlay,
  DialogOverlayProps,
  DialogPortal,
  DialogRoot,
  DialogRootProps,
  DialogTitle,
  DialogTitleProps,
  DialogTrigger,
} from '@dxos/aurora';
import { defaultFocus, defaultHover, getSize, mx } from '@dxos/aurora-theme';

import { TooltipRoot, TooltipContent, TooltipTrigger } from '../Tooltip';

export interface DialogSlots {
  overlay?: Pick<DialogOverlayProps, 'classNames'>;
  content?: Omit<DialogContentProps, 'children'>;
  title?: Omit<DialogTitleProps, 'children'>;
  description?: Omit<DialogDescriptionProps, 'children'>;
  close?: Pick<DialogCloseProps, 'className'>;
  closeIcon?: ComponentProps<typeof X>;
  closeTriggers?: Omit<ComponentProps<'div'>, 'children'>;
}

export interface DialogProps extends Pick<DialogRootProps, 'open' | 'defaultOpen' | 'onOpenChange'> {
  title: ReactNode;
  openTrigger?: ReactNode;
  closeTriggers?: [ReactNode, ...ReactNode[]];
  titleVisuallyHidden?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  mountAsSibling?: boolean;
  slots?: DialogSlots;
}

/**
 * @deprecated please use the components from @dxos/aurora directly
 */
export const Dialog = ({
  title,
  titleVisuallyHidden,
  description,
  openTrigger,
  closeTriggers,
  children,
  closeLabel,
  mountAsSibling,
  open: propsOpen,
  defaultOpen: propsDefaultOpen,
  onOpenChange: propsOnOpenChange,
  slots = {},
}: DialogProps) => {
  const [open = false, setOpen] = useControllableState({
    prop: propsOpen,
    defaultProp: propsDefaultOpen,
    onChange: propsOnOpenChange,
  });

  const dialogOverlayAndContent = (
    <DialogOverlay forceMount {...slots.overlay} classNames={slots.overlay?.classNames}>
      <DialogContent
        forceMount
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        {...slots.content}
        classNames={slots.content?.classNames}
      >
        <DialogTitle {...slots.title} classNames={slots?.title?.classNames}>
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription {...slots.description} classNames={slots.description?.classNames}>
            {description}
          </DialogDescription>
        )}

        {children}

        {closeLabel && (
          <TooltipRoot>
            <TooltipContent classNames='z-[51]'>{closeLabel}</TooltipContent>
            <TooltipTrigger asChild>
              <DialogClose
                className={mx(
                  'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
                  defaultFocus,
                  defaultHover,
                  slots.close?.className,
                )}
              >
                <X
                  className={mx(
                    getSize(4),
                    'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400',
                    slots.closeIcon?.className,
                  )}
                />
              </DialogClose>
            </TooltipTrigger>
          </TooltipRoot>
        )}
        {closeTriggers && (
          <div
            {...slots.closeTriggers}
            className={mx('flex flex-wrap justify-end gap-4', slots.closeTriggers?.className)}
          >
            {closeTriggers.map((closeTrigger, key) => (
              <DialogClose key={key} asChild>
                {closeTrigger}
              </DialogClose>
            ))}
          </div>
        )}
      </DialogContent>
    </DialogOverlay>
  );

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      {openTrigger && <DialogTrigger asChild>{openTrigger}</DialogTrigger>}
      {mountAsSibling ? dialogOverlayAndContent : <DialogPortal forceMount>{dialogOverlayAndContent}</DialogPortal>}
    </DialogRoot>
  );
};
