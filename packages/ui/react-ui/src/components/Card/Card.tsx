//
// Copyright 2025 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type PropsWithChildren,
  createContext,
  forwardRef,
  useContext,
} from 'react';

import { type Density } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { Container } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { Button } from '../Button';
import { Icon, type IconProps } from '../Icon';
import { Image } from '../Image';
import { Toolbar, type ToolbarMenuItem, type ToolbarMenuProps, type ToolbarRootProps } from '../Toolbar';

type CardSharedProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  asChild?: boolean;
  className?: string;
};

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

type CardRootProps = CardSharedProps & {
  id?: string;
  border?: boolean;
  fullWidth?: boolean;
};

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ children, classNames, className, id, asChild, role, border = true, fullWidth, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...(id && { 'data-object-id': id })}
        {...props}
        role={role ?? 'group'}
        className={tx('card.root', { border, fullWidth }, [className, classNames])}
        ref={forwardedRef}
      >
        <Container.Column gutter='rail'>{children}</Container.Column>
      </Root>
    );
  },
);

//
// Toolbar
//

type CardToolbarProps = ToolbarRootProps & {
  density?: Density;
};

// TODO(burdon): Roncile name with DialogHeader.
const CardToolbar = forwardRef<HTMLDivElement, CardToolbarProps>(
  ({ children, classNames, density = 'fine', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Toolbar.Root
        {...props}
        classNames={[tx('card.toolbar', { coarse: density !== 'fine' }), classNames]}
        ref={forwardedRef}
      >
        {children}
      </Toolbar.Root>
    );
  },
);

//
// Menu (delegated to Toolbar.Menu)
//

type CardMenuItem<T extends any | void = void> = ToolbarMenuItem<T>;
type CardMenuProps<T extends any | void = void> = ToolbarMenuProps<T>;

// TODO(burdon): Remove and Push up to Toolbar (incl. state).
const CardMenu = <T extends any | void = void>({ context, items }: CardMenuProps<T>) => {
  const { menuItems } = useContext(CardContext) ?? {};
  const combinedItems = [...(items ?? []), ...((menuItems as CardMenuItem<T>[]) ?? [])];
  return <Toolbar.Menu context={context} items={combinedItems} />;
};

//
// Title
//

type CardTitleProps = CardSharedProps;

const CardTitle = forwardRef<HTMLDivElement, CardTitleProps>(
  ({ children, classNames, className, asChild, role, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...props}
        role={role ?? 'heading'}
        className={tx('card.title', {}, [className, classNames])}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

//
// Content
//

type CardContentProps = CardSharedProps;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ children, role, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <div role={role ?? 'none'} className={tx('card.content', {})} {...props} ref={forwardedRef}>
      {children}
    </div>
  );
});

//
// Row
//

type CardRowProps = CardSharedProps & { icon?: string };

const CardRow = forwardRef<HTMLDivElement, CardRowProps>(
  ({ children, classNames, className, role, icon, ...props }, forwardedRef) => {
    return (
      <Container.Row {...props} role={role ?? 'none'} classNames={[classNames, className]} ref={forwardedRef}>
        {(icon && <CardIcon classNames='text-subdued' icon={icon} />) || <div />}
        {children}
        <div />
      </Container.Row>
    );
  },
);

//
// Heading
//

type CardHeadingProps = CardSharedProps & { variant?: 'default' | 'subtitle' };

/**
 * @deprecated Use typography.
 */
const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, classNames, className, asChild, role, variant = 'default', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...props}
        role={role ?? 'heading'}
        className={tx('card.heading', { variant }, [classNames, className])}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

//
// Text
//

type CardTextProps = CardSharedProps & { truncate?: boolean; variant?: 'default' | 'description' };

const CardText = forwardRef<HTMLDivElement, CardTextProps>(
  ({ children, classNames, className, asChild, role, truncate, variant = 'default', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...props}
        role={role ?? 'none'}
        className={tx('card.text', { variant }, [classNames, className])}
        ref={forwardedRef}
      >
        <span className={tx('card.text-span', { variant, truncate })}>{children}</span>
      </Root>
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
      <div role='none' className='col-span-3 mb-1'>
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
      {icon ? <CardIcon classNames='text-subdued' icon={icon} /> : <div />}
      <span className={tx('card.action-label', {}, !actionIcon ? 'col-span-2' : undefined)}>{label}</span>
      {actionIcon && <CardIcon icon={actionIcon} />}
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
// Icon
//

const CardIcon = ({ toolbar, ...props }: IconProps & { toolbar?: boolean }) => {
  return (
    <CardIconBlock>
      <Icon {...props} size={toolbar ? 5 : 4} />
    </CardIconBlock>
  );
};

//
// IconBlock
//

const CardIconBlock = ({
  classNames,
  children,
  role,
  ...props
}: ThemedClassName<PropsWithChildren<HTMLAttributes<HTMLDivElement>>>) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} role={role ?? 'none'} className={tx('card.icon-block', {}, classNames)}>
      {children}
    </div>
  );
};

//
// Card
//

export const Card = {
  Context: CardContext,
  Root: CardRoot,

  // Toolbar
  Toolbar: CardToolbar,
  ToolbarIconButton: Toolbar.IconButton,
  ToolbarSeparator: Toolbar.Separator,
  DragHandle: Toolbar.DragHandle,
  CloseIconButton: Toolbar.CloseIconButton,
  Title: CardTitle,
  Menu: CardMenu,
  Icon: CardIcon,
  IconBlock: CardIconBlock,

  // Content
  Content: CardContent,
  Row: CardRow,
  Heading: CardHeading,
  Text: CardText,
  Poster: CardPoster,
  Action: CardAction,
  Link: CardLink,
};

export type { CardContextValue, CardRootProps, CardToolbarProps, CardMenuProps };
