//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type FC,
  forwardRef,
  type PropsWithChildren,
} from 'react';

import { Icon, IconButton, type ThemedClassName, Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { hoverableControls, mx } from '@dxos/react-ui-theme';

import { cardChrome, cardRoot, cardHeading, cardText, cardSpacing } from './fragments';
import { StackItem } from '../../components';
import { translationKey } from '../../translations';

type SharedCardProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

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
const CardSurfaceRoot = ({ role = 'never', children }: PropsWithChildren<{ role?: string }>) => {
  if (['popover', 'card--kanban'].includes(role)) {
    return (
      <div className={role === 'popover' ? 'popover-card-width' : role === 'card--kanban' ? 'contents' : ''}>
        {children}
      </div>
    );
  } else {
    return (
      <CardStaticRoot {...(role === 'card--document' && { classNames: ['mlb-[1em]', hoverableControls] })}>
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
    return (
      <img className={`dx-card__poster ${aspect} object-cover is-full bs-auto`} src={props.image} alt={props.alt} />
    );
  }
  if (props.icon) {
    return (
      <div
        role='image'
        className={`dx-card__poster grid ${aspect} place-items-center bg-inputSurface text-subdued`}
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

export { cardRoot, cardHeading, cardText, cardChrome, cardSpacing };
