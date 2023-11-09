//
// Copyright 2022 DXOS.org
//

import { X } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentProps, type ReactNode } from 'react';

import {
  Dialog as NaturalDialog,
  type DialogCloseProps,
  type DialogContentProps,
  type DialogDescriptionProps,
  type DialogOverlayProps,
  type DialogRootProps,
  type DialogTitleProps,
} from '@dxos/react-ui';
import { focusRing, getSize, ghostHover, mx } from '@dxos/react-ui-theme';

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
 * @deprecated please use the components from @dxos/react-ui directly
 */
export const Dialog = ({
  title,
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
    <NaturalDialog.Overlay {...slots.overlay} classNames={slots.overlay?.classNames}>
      <NaturalDialog.Content
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        {...slots.content}
        classNames={slots.content?.classNames}
      >
        <NaturalDialog.Title {...slots.title} classNames={slots?.title?.classNames}>
          {title}
        </NaturalDialog.Title>
        {description && (
          <NaturalDialog.Description {...slots.description} classNames={slots.description?.classNames}>
            {description}
          </NaturalDialog.Description>
        )}

        {children}

        {closeLabel && (
          <TooltipRoot>
            <TooltipContent classNames='z-[51]'>{closeLabel}</TooltipContent>
            <TooltipTrigger asChild>
              <NaturalDialog.Close
                className={mx(
                  'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
                  focusRing,
                  ghostHover,
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
              </NaturalDialog.Close>
            </TooltipTrigger>
          </TooltipRoot>
        )}
        {closeTriggers && (
          <div
            {...slots.closeTriggers}
            className={mx('flex flex-wrap justify-end gap-4', slots.closeTriggers?.className)}
          >
            {closeTriggers.map((closeTrigger, key) => (
              <NaturalDialog.Close key={key} asChild>
                {closeTrigger}
              </NaturalDialog.Close>
            ))}
          </div>
        )}
      </NaturalDialog.Content>
    </NaturalDialog.Overlay>
  );

  return (
    <NaturalDialog.Root open={open} onOpenChange={setOpen}>
      {openTrigger && <NaturalDialog.Trigger asChild>{openTrigger}</NaturalDialog.Trigger>}
      {mountAsSibling ? (
        dialogOverlayAndContent
      ) : (
        <NaturalDialog.Portal>{dialogOverlayAndContent}</NaturalDialog.Portal>
      )}
    </NaturalDialog.Root>
  );
};
