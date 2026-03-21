//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, createContext, forwardRef, useContext } from 'react';

import { composableProps, iconSize, mx } from '@dxos/ui-theme';
import { ComposableProps, type Density, type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { Column } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { Button } from '../Button';
import { Icon, type IconProps } from '../Icon';
import { Image } from '../Image';
import {
  Toolbar,
  ToolbarCloseIconButtonProps,
  ToolbarDragHandleProps,
  type ToolbarMenuItem,
  type ToolbarMenuProps,
  type ToolbarRootProps,
} from '../Toolbar';

//
// Context
//

type CardContextValue = {
  menuItems?: CardMenuItem<any>[];
};

/** @deprecated Use context for menus. */
const CardContext = createContext<CardContextValue>({});

//
// Root
//

type CardRootProps = SlottableProps<
  HTMLDivElement,
  {
    id?: string;
    border?: boolean;
    fullWidth?: boolean;
    density?: Density;
  }
>;

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ children, id, asChild, role, border = true, fullWidth, density, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();

    return (
      <Comp
        {...rest}
        {...(id && { 'data-object-id': id })}
        role={role ?? 'group'}
        className={tx('card.root', { border, fullWidth }, className)}
        ref={forwardedRef}
      >
        <Column.Root gutter={density === 'coarse' ? 'lg' : 'md'}>{children}</Column.Root>
      </Comp>
    );
  },
);

//
// Toolbar
//

type CardToolbarProps = ToolbarRootProps;

const CardToolbar = forwardRef<HTMLDivElement, CardToolbarProps>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();

  return (
    <Toolbar.Root {...props} style={iconSize(5)} classNames={[tx('card.toolbar', {}), classNames]} ref={forwardedRef}>
      {children}
    </Toolbar.Root>
  );
});

//
// DragHandle
//

type CardDragHandleProps = ToolbarDragHandleProps;

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>((props, forwardedRef) => {
  return (
    <CardIconBlock padding>
      <Toolbar.DragHandle {...props} testId='card-drag-handle' ref={forwardedRef} />
    </CardIconBlock>
  );
});

//
// CloseIconButton
//

type CloseIconButtonProps = ToolbarCloseIconButtonProps;

const CloseIconButton = forwardRef<HTMLButtonElement, CloseIconButtonProps>((props, forwardedRef) => {
  return (
    <CardIconBlock padding>
      <Toolbar.CloseIconButton {...props} ref={forwardedRef} />
    </CardIconBlock>
  );
});

//
// Menu
//

type CardMenuItem<T extends any | void = void> = ToolbarMenuItem<T>;

type CardMenuProps<T extends any | void = void> = ToolbarMenuProps<T>;

const CardMenu = <T extends any | void = void>({ context, items, ...props }: CardMenuProps<T>) => {
  const { menuItems } = useContext(CardContext) ?? {};
  const combinedItems = [...(items ?? []), ...((menuItems as CardMenuItem<T>[]) ?? [])];

  return (
    <CardIconBlock padding>
      <Toolbar.Menu {...props} context={context} items={combinedItems} />
    </CardIconBlock>
  );
};

//
// Icon
//

const CardIcon = (props: IconProps) => {
  return (
    <CardIconBlock>
      <Icon {...props} />
    </CardIconBlock>
  );
};

//
// IconBlock
//

const CardIconBlock = forwardRef<HTMLDivElement, ThemedClassName<PropsWithChildren<{ padding?: boolean }>>>(
  ({ classNames, children, padding, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();

    return (
      <div {...props} role='none' className={tx('card.icon-block', { padding }, classNames)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

//
// Title
//

type CardTitleProps = SlottableProps<HTMLDivElement>;

const CardTitle = forwardRef<HTMLDivElement, CardTitleProps>(({ children, asChild, role, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { role: 'heading' });
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();

  return (
    <Comp {...rest} className={tx('card.title', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

//
// Content
//

type CardContentProps = SlottableProps<HTMLDivElement>;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, asChild, role, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { role: 'none' });
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();

    return (
      <Comp {...rest} className={tx('card.content', {}, className)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

//
// Row
//

type CardRowProps = ComposableProps<HTMLDivElement, { icon?: string; fullWidth?: boolean }>;

const CardRow = forwardRef<HTMLDivElement, CardRowProps>(({ children, role, icon, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { role: 'none' });
  const { tx } = useThemeContext();

  return (
    <Column.Row {...rest} className={tx('card.row', {}, className)} ref={forwardedRef}>
      {(icon && <CardIcon classNames='text-subdued' icon={icon} size={4} />) || <div />}
      {children}
    </Column.Row>
  );
});

//
// Section
//

type CardSectionProps = SlottableProps<HTMLDivElement>;

/**
 * @deprecated Merge with Card.Row fullWidth
 */
const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, asChild, role, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

    return (
      <Comp {...rest} role={role ?? 'none'} className={mx('col-span-full', className)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

//
// Heading
//

type CardHeadingProps = SlottableProps<HTMLDivElement, { variant?: 'default' | 'subtitle' }>;

/**
 * @deprecated Use typography.
 */
const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, asChild, role, variant = 'default', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();

    return (
      <Comp
        {...rest}
        role={role ?? 'heading'}
        className={tx('card.heading', { variant }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

//
// Text
//

type CardTextProps = SlottableProps<HTMLDivElement, { truncate?: boolean; variant?: 'default' | 'description' }>;

const CardText = forwardRef<HTMLDivElement, CardTextProps>(
  ({ children, asChild, role, truncate, variant = 'default', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();

    return (
      <Comp {...rest} role={role ?? 'none'} className={tx('card.text', { variant }, className)} ref={forwardedRef}>
        <span className={tx('card.text-span', { variant, truncate })}>{children}</span>
      </Comp>
    );
  },
);

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
  const { tx } = useThemeContext();
  const aspect = props.aspect === 'auto' ? 'aspect-auto' : 'aspect-video';

  if (props.image) {
    return (
      <div role='none' className='col-span-full mb-1'>
        <Image classNames={[tx('card.poster', {}), aspect, props.classNames]} src={props.image} alt={props.alt} />
      </div>
    );
  }

  if (props.icon) {
    return (
      <div role='image' className={tx('card.poster-icon', {}, [aspect, props.classNames])} aria-label={props.alt}>
        <Icon icon={props.icon} size={10} />
      </div>
    );
  }
};

//
// Action
//

type CardActionProps = { icon?: string; label: string; actionIcon?: string; onClick?: () => void };

const CardAction = ({ icon, actionIcon = 'ph--arrow-right--regular', label, onClick }: CardActionProps) => {
  const { tx } = useThemeContext();
  return (
    <Button variant='ghost' classNames={tx('card.action', {})} onClick={onClick}>
      {icon ? <CardIcon classNames='text-subdued' icon={icon} size={4} /> : <div />}
      <span className={tx('card.action-label', {}, !actionIcon ? 'col-span-2' : undefined)}>{label}</span>
      {actionIcon && <CardIcon icon={actionIcon} size={4} />}
    </Button>
  );
};

//
// Link
//

type CardLinkProps = { label: string; href: string };

const CardLink = ({ label, href }: CardLinkProps) => {
  const { tx } = useThemeContext();
  return (
    <a className={tx('card.link', {})} data-variant='ghost' href={href} target='_blank' rel='noreferrer'>
      <CardIcon classNames='text-subdued' icon='ph--link--regular' />
      <span className={tx('card.link-label', {})}>{label}</span>
      <CardIcon classNames='invisible group-hover:visible' icon='ph--arrow-square-out--regular' />
    </a>
  );
};

//
// Card
//

export const Card = {
  Root: CardRoot,

  // Toolbar
  Toolbar: CardToolbar,
  ToolbarIconButton: Toolbar.IconButton,
  ToolbarSeparator: Toolbar.Separator,

  // Toolbar blocks
  IconBlock: CardIconBlock,
  DragHandle: CardDragHandle,
  CloseIconButton: CloseIconButton,
  Menu: CardMenu,
  Icon: CardIcon,
  Title: CardTitle,

  // Content
  Content: CardContent,
  Row: CardRow,
  Section: CardSection,
  Heading: CardHeading,
  Text: CardText,
  Poster: CardPoster,
  Action: CardAction,
  Link: CardLink,
};

export type {
  CardContextValue,
  CardRootProps,
  CardToolbarProps,
  CardDragHandleProps,
  CloseIconButtonProps,
  CardMenuProps,
};
