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
import { hoverableControls, mx } from '@dxos/react-ui-theme';

import { Image, StackItem } from '../../components';
import { translationKey } from '../../translations';

import { cardChrome, cardHeading, cardRoot, cardSpacing, cardText } from './fragments';

type SharedCardProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

/**
 * The default width of cards. It should be no larger than 320px per WCAG 2.1 SC 1.4.10.
 */
const cardDefaultInlineSize = 18;
/**
 * This is `cardDefaultInlineSize` plus 2 times the sum of the inner and outer spacing applied by CardStack on the
 * inline axis.
 */
const cardStackDefaultInlineSizeRem = cardDefaultInlineSize + 2.125;

const CardStaticRoot = forwardRef<HTMLDivElement, SharedCardProps>(
  ({ children, classNames, asChild, role = 'group', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const rootProps = asChild ? { classNames: [cardRoot, classNames] } : { className: mx(cardRoot, classNames), role };
    return (
      <Root {...props} {...rootProps} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

/**
 * This should be used by Surface fulfillments in cases where the content may or may not already be encapsulated (e.g.
 * in a Popover) and knows this based on the `role` it receives. This will render a `Card.StaticRoot` by default, otherwise
 * it will render a `div` primitive with the appropriate styling for specific handled situations.
 */
const CardSurfaceRoot = ({
  role = 'never',
  children,
  classNames,
}: ThemedClassName<PropsWithChildren<{ role?: string }>>) => {
  if (['card--popover', 'card--intrinsic', 'card--extrinsic'].includes(role)) {
    return (
      <div
        className={mx(
          role === 'card--popover'
            ? 'popover-card-width'
            : ['card--intrinsic', 'card--extrinsic'].includes(role)
              ? 'contents'
              : '',
          classNames,
        )}
      >
        {children}
      </div>
    );
  } else {
    return (
      <CardStaticRoot
        classNames={[
          role === 'card--transclusion' && 'mlb-1',
          role === 'card--transclusion' && hoverableControls,
          classNames,
        ]}
      >
        {children}
      </CardStaticRoot>
    );
  }
};

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

const CardToolbar = forwardRef<HTMLDivElement, ToolbarRootProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <Toolbar.Root {...props} classNames={['bg-transparent density-coarse', classNames]} ref={forwardedRef}>
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
      label={t('drag handle label')}
      classNames='pli-2'
      ref={forwardedRef}
    />
  );
});

const CardDragPreview = StackItem.DragPreview;

const CardMenu = Primitive.div as FC<ComponentPropsWithRef<'div'>>;

type CardPosterProps = {
  alt: string;
  aspect?: 'video' | 'auto';
} & Partial<{ image: string; icon: string }>;

const CardPoster = (props: CardPosterProps) => {
  const aspect = props.aspect === 'auto' ? 'aspect-auto' : 'aspect-video';
  if (props.image) {
    return <Image classNames={[`dx-card__poster is-full`, aspect]} src={props.image} alt={props.alt} />;
  }

  if (props.icon) {
    return (
      <div
        role='image'
        className={mx(`dx-card__poster grid place-items-center bg-inputSurface text-subdued`, aspect)}
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

export const Card = {
  StaticRoot: CardStaticRoot,
  SurfaceRoot: CardSurfaceRoot,
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

export {
  cardRoot,
  cardHeading,
  cardText,
  cardChrome,
  cardSpacing,
  cardStackDefaultInlineSizeRem,
  cardDefaultInlineSize,
};
