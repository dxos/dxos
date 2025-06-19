//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, type FC, forwardRef } from 'react';

import { Icon, IconButton, type ThemedClassName, Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { cardChrome, cardContent, cardHeading, cardRoot, cardText } from './fragments';
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
    const rootProps = asChild
      ? { classNames: [cardHeading, cardText, classNames] }
      : { className: mx(cardHeading, cardText, classNames), role };
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
        classNames={[
          'dx-card__toolbar group-has-[.dx-card__poster]/card:absolute block-start-0 inset-inline-0 bg-transparent bs-[--rail-action]',
          classNames,
        ]}
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

type CardPosterProps = {
  alt: string;
} & Partial<{ image: string; icon: string }>;

const CardPoster = (props: CardPosterProps) => {
  if (props.image) {
    return (
      <img className='dx-card__poster aspect-video object-cover is-full bs-auto' src={props.image} alt={props.alt} />
    );
  }
  if (props.icon) {
    return (
      <div
        role='image'
        className='dx-card__poster grid aspect-video place-items-center bg-inputSurface text-subdued'
        aria-label={props.alt}
      >
        <Icon icon={props.icon} size={10} />
      </div>
    );
  }
};

const CardChrome = forwardRef<HTMLDivElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardChrome, classNames] }
      : { className: mx(cardChrome, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

const CardText = forwardRef<HTMLParagraphElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'p';
    const rootProps = asChild ? { classNames: [cardText, classNames] } : { className: mx(cardText, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

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
  Poster: CardPoster,
  Chrome: CardChrome,
  Text: CardText,
};

export { cardRoot, cardContent, cardHeading, cardText, cardChrome };
