//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, type FC, forwardRef } from 'react';

import { IconButton, type ThemedClassName, Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { cardContent, cardRoot } from './fragments';
import { StackItem } from '../../components';
import { translationKey } from '../../translations';

type SharedCardProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

const CardRoot = forwardRef<HTMLDivElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild ? { classNames: [cardRoot, classNames] } : { className: mx(cardRoot, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const CardContent = forwardRef<HTMLDivElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'group', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardContent, classNames] }
      : { className: mx(cardContent, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const CardHeading = forwardRef<HTMLDivElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'heading', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild ? { classNames } : { className: mx(classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const CardToolbar = forwardRef<HTMLDivElement, ToolbarRootProps>(
  ({ children, classNames, asChild, ...props }, forwardedRef) => {
    return (
      <Toolbar.Root
        {...props}
        classNames={['absolute block-start-0 inset-inline-0 bg-transparent', classNames]}
        ref={forwardedRef}
      >
        {children}
      </Toolbar.Root>
    );
  },
);

const CardToolbarIconButton = Toolbar.IconButton;
const CardToolbarSeparator = Toolbar.Separator;

const CardDragHandle = forwardRef<HTMLButtonElement, { toolbarItem?: boolean }>(({ toolbarItem }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const Root = toolbarItem ? Toolbar.IconButton : IconButton;
  return (
    <Root
      iconOnly
      icon='ph--dots-six-vertical--regular'
      variant='ghost'
      label={t('card drag handle label')}
      classNames='pli-2'
      ref={forwardedRef}
    />
  );
});

const CardDragPreview = StackItem.DragPreview;

const CardMenu = Primitive.div as FC<ComponentPropsWithRef<'div'>>;

const CardMedia = Primitive.img as FC<ComponentPropsWithRef<'img'>>;

export const Card = {
  Root: CardRoot,
  Content: CardContent,
  Heading: CardHeading,
  Toolbar: CardToolbar,
  ToolbarIconButton: CardToolbarIconButton,
  ToolbarSeparator: CardToolbarSeparator,
  DragHandle: CardDragHandle,
  DragPreview: CardDragPreview,
  Menu: CardMenu,
  Media: CardMedia,
};

export { cardRoot, cardContent };
