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

import {
  Button,
  type Density,
  DropdownMenu,
  Icon,
  type IconProps,
  type ThemedClassName,
  Toolbar,
  type ToolbarRootProps,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { Image } from '../Image';

import { styles } from './styles';

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

/** @deprecated Create context for menus. */
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
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...(id && { 'data-object-id': id })}
        {...props}
        role={role}
        className={mx(styles.root, border && styles.border, fullWidth && 'max-w-none!', className, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

//
// Toolbar
//

type CardToolbarProps = ToolbarRootProps & {
  // TODO(burdon): Generalize: 1. systematic across theme; 2. should affect rows, etc.
  density?: Density;
};

const CardToolbar = forwardRef<HTMLDivElement, CardToolbarProps>(
  ({ children, classNames, density = 'fine', ...props }, forwardedRef) => {
    return (
      <Toolbar.Root
        {...props}
        classNames={[
          'dx-density-fine bg-transparent',
          density === 'fine' ? styles.grid_3 : styles.grid_3_coarse,
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

//
// DragHandle
//

type CardDragHandleProps = {};

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>((_, forwardedRef) => {
  const { t } = useTranslation(translationKey);

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
  const { t } = useTranslation(translationKey);

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
  const { t } = useTranslation(translationKey);
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
    const Root = asChild ? Slot : 'div';

    return (
      <Root {...props} role={role} className={mx('grow truncate', classNames, className)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

//
// Content
// TODO(burdon): Root for card--content role (possibly multiple).
//  - Able to add menu options/set title, etc. via context.
// TODO(burdon): Consider collapsible sections (surfaces).
//

type CardContentProps = PropsWithChildren;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div role='none' className='contents [&>:last-child]:pb-1' {...props} ref={forwardedRef}>
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
      <div {...props} role={role} className={mx(styles.grid_2, 'px-1', classNames, className)} ref={forwardedRef}>
        {(icon && <CardIcon classNames='text-subdued' icon={icon} />) || <div />}
        {children}
      </div>
    );
  },
);

//
// Heading
//

type CardHeadingProps = CardSharedProps & { variant?: 'default' | 'subtitle' };

const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, classNames, className, asChild, role = 'heading', variant = 'default', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    // NOTE: Padding align first line of text with center of icon.
    const variantClassNames: Record<string, string> = {
      default: 'py-1',
      subtitle: 'py-2 text-xs text-description font-medium uppercase',
    };

    return (
      <Root {...props} role={role} className={mx(variantClassNames[variant], classNames, className)} ref={forwardedRef}>
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
    const Root = asChild ? Slot : 'div';
    // NOTE: Padding align first line of text with center of icon.
    const variantClassNames: Record<string, { root: string; span?: string }> = {
      default: {
        root: 'py-1',
      },
      description: {
        root: 'py-1.5',
        span: 'text-sm text-description line-clamp-3',
      },
    };

    return (
      <Root
        {...props}
        role={role}
        className={mx('flex overflow-hidden', variantClassNames[variant].root, classNames, className)}
        ref={forwardedRef}
      >
        <span className={mx(variantClassNames[variant].span, truncate && 'truncate')}>{children}</span>
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
  const aspect = props.aspect === 'auto' ? 'aspect-auto' : 'aspect-video';
  if (props.image) {
    return (
      <div role='none' className='mb-1'>
        <Image classNames={[styles.poster, aspect, props.classNames]} src={props.image} alt={props.alt} />
      </div>
    );
  }

  if (props.icon) {
    return (
      <div
        role='image'
        className={mx('grid place-items-center bg-input-surface text-subdued', styles.poster, aspect, props.classNames)}
        aria-label={props.alt}
      >
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
  return (
    <div role='none' className='w-full px-1'>
      <Button
        variant='ghost'
        classNames={mx(styles.grid_3, 'p-0! w-full text-start overflow-hidden')}
        onClick={onClick}
      >
        {icon ? <CardIcon classNames='text-subdued' icon={icon} /> : <div />}
        <span className={mx('min-w-0 flex-1 truncate', !actionIcon && 'col-span-2')}>{label}</span>
        {actionIcon && <CardIcon icon={actionIcon} />}
      </Button>
    </div>
  );
};

//
// Link
//

type CardLinkProps = { label: string; href: string };

const CardLink = ({ label, href }: CardLinkProps) => {
  return (
    <div role='none' className='w-full px-1'>
      <a
        className={mx(styles.grid_3, 'group p-0! dx-button dx-focus-ring min-h-1!')}
        data-variant='ghost'
        href={href}
        target='_blank'
        rel='noreferrer'
      >
        <CardIcon classNames='text-subdued' icon='ph--link--regular' />
        <span className={mx('min-w-0 flex-1 truncate')}>{label}</span>
        <CardIcon classNames='invisible group-hover:visible' icon='ph--arrow-square-out--regular' />
      </a>
    </div>
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
  return (
    <div
      {...props}
      role={role}
      className={mx('grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center', classNames)}
    >
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
