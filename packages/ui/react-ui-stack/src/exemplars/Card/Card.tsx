//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, type FC, forwardRef } from 'react';

import { IconButton, type ThemedClassName, Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { cardContent, cardRoot } from './fragments';
import { StackItem } from '../../components';
import { translationKey } from '../../translations';

type SharedCardProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const CardRoot = forwardRef<HTMLDivElement, SharedCardProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <div role='none' {...props} className={mx(cardRoot, classNames)} ref={forwardedRef}>
      {children}
    </div>
  );
});

const CardContent = forwardRef<HTMLDivElement, SharedCardProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <div role='group' {...props} className={mx(cardContent, classNames)} ref={forwardedRef}>
      {children}
    </div>
  );
});

const CardHeading = forwardRef<HTMLDivElement, SharedCardProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <div role='heading' {...props} className={mx(classNames)}>
      {children}
    </div>
  );
});

const CardToolbar = forwardRef<HTMLDivElement, ToolbarRootProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <Toolbar.Root {...props} classNames={['absolute block-start-0 inset-inline-0', classNames]} ref={forwardedRef}>
      {children}
    </Toolbar.Root>
  );
});

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
