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
import { useTranslation } from 'react-i18next';

import { osTranslations } from '@dxos/ui-theme';
import { type Density } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { Container } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { Button } from '../Button';
import { Icon, type IconProps } from '../Icon';
import { Image } from '../Image';
import { DropdownMenu } from '../Menu';
import { Toolbar, type ToolbarRootProps } from '../Toolbar';

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
  (
    { children, classNames, className, id, asChild, role = 'group', border = true, fullWidth, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...(id && { 'data-object-id': id })}
        {...props}
        role={role}
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

const CardToolbar = forwardRef<HTMLDivElement, CardToolbarProps>(
  ({ children, classNames, density = 'fine', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Container.Row asChild>
        <Toolbar.Root
          {...props}
          classNames={[tx('card.toolbar', { coarse: density !== 'fine' }), classNames]}
          ref={forwardedRef}
        >
          {children}
        </Toolbar.Root>
      </Container.Row>
    );
  },
);

const CardToolbarIconButton = Toolbar.IconButton;
const CardToolbarSeparator = Toolbar.Separator;

//
// DragHandle
//

type CardDragHandleProps = {};

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>((_, forwardedRef) => {
  const { t } = useTranslation(osTranslations);

  return (
    <Toolbar.IconButton
      data-testid='card-drag-handle'
      noTooltip
      iconOnly
      icon='ph--dots-six-vertical--regular'
      variant='ghost'
      label={t('drag handle label')}
      classNames='cursor-pointer'
      size={5}
      disabled={!forwardedRef}
      ref={forwardedRef}
    />
  );
});

//
// Close
//

type CardCloseProps = { onClick?: () => void };

const CardClose = forwardRef<HTMLButtonElement, CardCloseProps>(({ onClick }, forwardedRef) => {
  const { t } = useTranslation(osTranslations);

  return (
    <Toolbar.IconButton
      iconOnly
      icon='ph--x--regular'
      variant='ghost'
      label={t('card close label')}
      classNames='cursor-pointer'
      size={5}
      onClick={onClick}
      ref={forwardedRef}
    />
  );
});

//
// Menu
//

type CardMenuItem<T extends any | void = void> = {
  label: string;
  onClick: (context: T) => void;
};

type CardMenuProps<T extends any | void = void> = {
  context?: T;
  items?: CardMenuItem<T>[];
};

const CardMenu = <T extends any | void = void>({ context, items }: CardMenuProps<T>) => {
  const { t } = useTranslation(osTranslations);
  const { menuItems } = useContext(CardContext) ?? {};
  const combinedItems = [...(items ?? []), ...((menuItems as CardMenuItem<T>[]) ?? [])];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={!combinedItems.length} asChild>
        <Card.ToolbarIconButton
          iconOnly
          variant='ghost'
          icon='ph--dots-three-vertical--regular'
          label={t('action menu label')}
        />
      </DropdownMenu.Trigger>
      {(combinedItems?.length ?? 0) > 0 && (
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {combinedItems?.map(({ label, onClick: onSelect }, i) => (
                <DropdownMenu.Item key={i} onSelect={() => onSelect(context as T)}>
                  {label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      )}
    </DropdownMenu.Root>
  );
};

//
// Title
//

type CardTitleProps = CardSharedProps;

const CardTitle = forwardRef<HTMLDivElement, CardTitleProps>(
  ({ children, classNames, className, asChild, role = 'heading', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root {...props} role={role} className={tx('card.title', {}, [classNames, className])} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Content
//

type CardContentProps = PropsWithChildren;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <div role='none' className={tx('card.content', {})} {...props} ref={forwardedRef}>
      {children}
    </div>
  );
});

//
// Row
//

type CardRowProps = CardSharedProps & { icon?: string };

const CardRow = forwardRef<HTMLDivElement, CardRowProps>(
  ({ children, classNames, className, role = 'none', icon, ...props }, forwardedRef) => {
    return (
      <Container.Row {...props} role={role} classNames={[classNames, className]} ref={forwardedRef}>
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

const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, classNames, className, asChild, role = 'heading', variant = 'default', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...props}
        role={role}
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
  (
    { children, classNames, className, asChild, role = 'none', truncate, variant = 'default', ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'div';

    return (
      <Root {...props} role={role} className={tx('card.text', { variant }, [classNames, className])} ref={forwardedRef}>
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
    <Container.Row asChild>
      <Button variant='ghost' classNames={tx('card.action', {})} onClick={onClick}>
        {icon ? <CardIcon classNames='text-subdued' icon={icon} /> : <div />}
        <span className={tx('card.action-label', {}, !actionIcon ? 'col-span-2' : undefined)}>{label}</span>
        {actionIcon && <CardIcon icon={actionIcon} />}
      </Button>
    </Container.Row>
  );
};

//
// Link
//

type CardLinkProps = { label: string; href: string };

const CardLink = ({ label, href }: CardLinkProps) => {
  const { tx } = useThemeContext();
  return (
    <Container.Row asChild>
      <a className={tx('card.link', {})} data-variant='ghost' href={href} target='_blank' rel='noreferrer'>
        <CardIcon classNames='text-subdued' icon='ph--link--regular' />
        <span className={tx('card.link-label', {})}>{label}</span>
        <CardIcon classNames='invisible group-hover:visible' icon='ph--arrow-square-out--regular' />
      </a>
    </Container.Row>
  );
};

//
// IconBlock
//

const CardIconBlock = ({
  classNames,
  children,
  role = 'none',
  ...props
}: ThemedClassName<PropsWithChildren<HTMLAttributes<HTMLDivElement>>>) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} role={role} className={tx('card.icon-block', {}, classNames)}>
      {children}
    </div>
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
// Card
//

export const Card = {
  Context: CardContext,
  Root: CardRoot,

  // Toolbar
  Toolbar: CardToolbar,
  ToolbarIconButton: CardToolbarIconButton,
  ToolbarSeparator: CardToolbarSeparator,
  DragHandle: CardDragHandle,
  Title: CardTitle,
  Close: CardClose,
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
