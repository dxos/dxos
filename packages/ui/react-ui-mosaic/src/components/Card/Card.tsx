//
// Copyright 2025 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, type PropsWithChildren, forwardRef } from 'react';

import {
  DropdownMenu,
  Icon,
  IconButton,
  type ThemedClassName,
  Toolbar,
  type ToolbarRootProps,
  useTranslation,
} from '@dxos/react-ui';
import { cardMinInlineSize, hoverableControls, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { Image } from '../Image';

// TODO(burdon): Use new styles.
import { cardChrome, cardGrid, cardHeading, cardRoot, cardSection, cardSpacing, cardText } from './styles';

/**
 * The default width of cards. It should be no larger than 320px per WCAG 2.1 SC 1.4.10.
 */
const cardDefaultInlineSize = cardMinInlineSize;

type CardSharedProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  asChild?: boolean;
  className?: string;
};

type CardRootProps = CardSharedProps & { id?: string };

/**
 *
 */
const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ children, classNames, className, id, asChild, role = 'group', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root
        {...(id && { 'data-object-id': id })}
        role={role}
        className={mx(cardRoot, className, classNames)}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

/**
 * This should be used by Surface fulfillments in cases where the content may or may not already be encapsulated (e.g., in a Popover) and knows this based on the `role` it receives.
 * This will render a `Card.Root` by default, otherwise it will render a `div` primitive with the appropriate styling for specific handled situations.
 * @deprecated Use Card.Root.
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
        <CardRoot
          id={id}
          classNames={[
            role === 'card--transclusion' && 'mlb-1',
            role === 'card--transclusion' && hoverableControls,
            classNames,
          ]}
          ref={forwardedRef}
        >
          {children}
        </CardRoot>
      );
    }
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
// Heading
//

type CardHeadingProps = CardSharedProps;

const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, classNames, className, asChild, role = 'heading', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root {...props} role={role} className={mx(cardHeading, classNames, className)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// DragHandle
//

type CardDragHandleProps = { toolbarItem?: boolean };

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>(({ toolbarItem }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const Root = toolbarItem ? Toolbar.IconButton : IconButton;
  return (
    <Root
      noTooltip
      iconOnly
      icon='ph--dots-six-vertical--regular'
      variant='ghost'
      label={t('drag handle label')}
      classNames='cursor-pointer'
      ref={forwardedRef}
    />
  );
});

//
// Menu
//

type CardMenuProps<T extends any | void = void> = {
  context?: T;
  items?: { label: string; onSelect: (context?: T) => void }[];
};

const CardMenu = <T extends any | void = void>({ context, items }: CardMenuProps<T>) => {
  const { t } = useTranslation(translationKey);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Card.ToolbarIconButton iconOnly variant='ghost' icon='ph--list--regular' label={t('action menu label')} />
      </DropdownMenu.Trigger>
      {(items?.length ?? 0) > 0 && (
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {items?.map(({ label, onSelect }, i) => (
                <DropdownMenu.Item key={i} onSelect={() => onSelect(context)}>
                  {label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Viewport>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      )}
    </DropdownMenu.Root>
  );
};

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

const CardChrome = forwardRef<HTMLDivElement, CardSharedProps>(
  ({ children, classNames, className, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root {...props} role={role} className={mx(cardChrome, classNames, className)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Section
//

type CardSectionProps = CardSharedProps & { fullWidth?: boolean; icon?: string };

const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, classNames, className, role = 'none', fullWidth, icon, ...props }, forwardedRef) => {
    return (
      <div role={role} className={mx(!fullWidth && cardSection, 'pli-1')} ref={forwardedRef}>
        {(!fullWidth || icon) && (
          <div role='none' className='grid bs-[var(--rail-item)] is-[var(--rail-item)] place-items-center'>
            {icon && <Icon icon={icon} />}
          </div>
        )}
        <div {...props} role='none' className={mx('plb-1', classNames, className)} ref={forwardedRef}>
          {children}
        </div>
      </div>
    );
  },
);

//
// Text
//

/**
 * @deprecated Use CardSection instead.
 */
const CardText = forwardRef<HTMLDivElement, CardSharedProps>(
  ({ children, classNames, className, asChild, role = 'none', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root {...props} role={role} className={mx(cardText, classNames, className)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Card
//

export const Card = {
  Root: CardRoot,
  SurfaceRoot: CardSurfaceRoot,
  Toolbar: CardToolbar,
  ToolbarIconButton: CardToolbarIconButton,
  ToolbarSeparator: CardToolbarSeparator,
  Heading: CardHeading,
  DragHandle: CardDragHandle,
  Menu: CardMenu,
  Poster: CardPoster,
  Chrome: CardChrome,
  Section: CardSection,
  Text: CardText,
};

export type { CardRootProps, CardMenuProps };

export { cardRoot, cardHeading, cardText, cardChrome, cardSpacing, cardDefaultInlineSize };
