//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type FC,
  type PropsWithChildren,
  forwardRef,
} from 'react';

import { Icon, IconButton, type ThemedClassName, Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { cardMinInlineSize, hoverableControls, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { Image } from '../Image';

import { cardChrome, cardGrid, cardHeading, cardRoot, cardSpacing, cardText } from './fragments';

/**
 * The default width of cards. It should be no larger than 320px per WCAG 2.1 SC 1.4.10.
 */
const cardDefaultInlineSize = cardMinInlineSize;

type SharedCardProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

/**
 * Use this when ....
 */
const CardStaticRoot = forwardRef<HTMLDivElement, SharedCardProps & { id?: string }>(
  ({ children, classNames, id, asChild, role = 'group', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild ? { classNames: [cardRoot, classNames] } : { className: mx(cardRoot, classNames), role };
    return (
      <Root {...(id && { 'data-object-id': id })} {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

/**
 * This should be used by Surface fulfillments in cases where the content may or may not already be encapsulated (e.g., in a Popover) and knows this based on the `role` it receives.
 * This will render a `Card.StaticRoot` by default, otherwise it will render a `div` primitive with the appropriate styling for specific handled situations.
 */
const CardSurfaceRoot = forwardRef<HTMLDivElement, ThemedClassName<PropsWithChildren<{ id?: string; role?: string }>>>(
  ({ id, role = 'never', children, classNames }, forwardedRef) => {
    if (['card--popover', 'card--intrinsic', 'card--extrinsic'].includes(role)) {
      return (
        <div
          {...(id && { 'data-object-id': id })}
          className={mx(
            role === 'card--popover'
              ? 'popover-card-width'
              : ['card--intrinsic', 'card--extrinsic'].includes(role)
                ? 'contents'
                : '',
            classNames,
          )}
          ref={forwardedRef}
        >
          {children}
        </div>
      );
    } else {
      return (
        <CardStaticRoot
          id={id}
          classNames={[
            role === 'card--transclusion' && 'mlb-1',
            role === 'card--transclusion' && hoverableControls,
            classNames,
          ]}
          ref={forwardedRef}
        >
          {children}
        </CardStaticRoot>
      );
    }
  },
);

//
// Heading
//

type CardHeadingProps = SharedCardProps & { truncate?: boolean };

const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, classNames, asChild, truncate, role = 'heading', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild
      ? { classNames: [cardHeading, cardText, truncate && 'truncate', classNames] }
      : { className: mx(cardHeading, cardText, truncate && 'truncate', classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Toolbar
//

const CardToolbar = forwardRef<HTMLDivElement, ToolbarRootProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <Toolbar.Root {...props} classNames={['density-fine bg-transparent', cardGrid, classNames]} ref={forwardedRef}>
      {children}
    </Toolbar.Root>
  );
});

const CardToolbarIconButton = Toolbar.IconButton;
const CardToolbarSeparator = Toolbar.Separator;

//
// DragHandle
//

const CardDragHandle = forwardRef<HTMLButtonElement, { toolbarItem?: boolean }>(({ toolbarItem }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const Root = toolbarItem ? Toolbar.IconButton : IconButton;
  return (
    <Root
      iconOnly
      icon='ph--dots-six-vertical--regular'
      variant='ghost'
      label={t('drag handle label')}
      ref={forwardedRef}
    />
  );
});

//
// Menu
//

const CardMenu = Primitive.div as FC<ComponentPropsWithRef<'div'>>;

//
// Poster
//

type CardPosterProps = ThemedClassName<
  {
    alt: string;
    aspect?: 'video' | 'auto';
  } & Partial<{ image: string; icon: string }>
>;

const CardPoster = (props: CardPosterProps) => {
  const aspect = props.aspect === 'auto' ? 'aspect-auto' : 'aspect-video';
  if (props.image) {
    return (
      <Image classNames={[`dx-card__poster is-full`, aspect, props.classNames]} src={props.image} alt={props.alt} />
    );
  }

  if (props.icon) {
    return (
      <div
        role='image'
        className={mx(`dx-card__poster grid place-items-center bg-inputSurface text-subdued`, aspect, props.classNames)}
        aria-label={props.alt}
      >
        <Icon icon={props.icon} size={10} />
      </div>
    );
  }
};

//
// Chrome
//

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

//
// Text
//

const CardText = forwardRef<HTMLDivElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild ? { classNames: [cardText, classNames] } : { className: mx(cardText, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Card
//

export const Card = {
  StaticRoot: CardStaticRoot,
  SurfaceRoot: CardSurfaceRoot,
  Heading: CardHeading,
  Toolbar: CardToolbar,
  ToolbarIconButton: CardToolbarIconButton,
  ToolbarSeparator: CardToolbarSeparator,
  DragHandle: CardDragHandle,
  Menu: CardMenu,
  Poster: CardPoster,
  Chrome: CardChrome,
  Text: CardText,
};

export { cardRoot, cardHeading, cardText, cardChrome, cardSpacing, cardDefaultInlineSize };
