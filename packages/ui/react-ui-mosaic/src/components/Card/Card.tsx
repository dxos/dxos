//
// Copyright 2025 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, createContext, forwardRef, useContext } from 'react';

import {
  Button,
  type ClassNameValue,
  DropdownMenu,
  Icon,
  type IconProps,
  type ThemedClassName,
  Toolbar,
  type ToolbarRootProps,
  useTranslation,
} from '@dxos/react-ui';
import { hoverableControls, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { Image } from '../Image';

import { cardChrome, cardSpacing, styles } from './styles';

//
// Context
//

type CardContextValue = {
  menuItems?: CardMenuItem<any>[];
};

const CardContext = createContext<CardContextValue>({});

type CardSharedProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  asChild?: boolean;
  className?: string;
};

//
// Root
//

type CardRootProps = CardSharedProps & { id?: string };

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ children, classNames, className, id, asChild, role = 'group', ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';

    // TODO(burdon): Document (see app-framework, and ui-theme size.css, length.ts)
    const roleClassNames: Record<string, ClassNameValue> = {
      'card--extrinsic': 'contents',
      'card--intrinsic': 'is-full min-is-cardMinWidth max-is-cardMaxWidth',
      'card--popover': 'is-full popover-card-width',
      'card--transclusion': ['is-full mlb-1', hoverableControls],
    };

    return (
      <Root
        {...(id && { 'data-object-id': id })}
        {...props}
        role={role}
        className={mx(styles.root, styles.grid, roleClassNames[role], className, classNames)}
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

const CardToolbar = forwardRef<HTMLDivElement, ToolbarRootProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <Toolbar.Root {...props} classNames={['density-fine bg-transparent', styles.row, classNames]} ref={forwardedRef}>
      {children}
    </Toolbar.Root>
  );
});

const CardToolbarIconButton = Toolbar.IconButton;
const CardToolbarSeparator = Toolbar.Separator;

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
// Heading
//

type CardHeadingProps = CardSharedProps & { padding?: boolean };

const CardHeading = forwardRef<HTMLDivElement, CardHeadingProps>(
  ({ children, classNames, className, asChild, role = 'heading', padding = true, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';

    return (
      <Root
        {...props}
        role={role}
        className={mx('grow truncate', padding && cardSpacing, classNames, className)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

//
// DragHandle
//

type CardDragHandleProps = {};

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>((_, forwardedRef) => {
  const { t } = useTranslation(translationKey);

  return (
    <Toolbar.IconButton
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

type CardMenuItem<T extends any | void = void> = {
  label: string;
  onSelect: (context: T) => void;
};

type CardMenuProps<T extends any | void = void> = {
  context?: T;
  items?: CardMenuItem<T>[];
};

const CardMenu = <T extends any | void = void>({ context, items }: CardMenuProps<T>) => {
  const { t } = useTranslation(translationKey);
  const { menuItems } = useContext(CardContext) ?? {};
  const combinedItems = [...(items ?? []), ...((menuItems as CardMenuItem<T>[]) ?? [])];

  if (!combinedItems.length) {
    return null;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Card.ToolbarIconButton iconOnly variant='ghost' icon='ph--list--regular' label={t('action menu label')} />
      </DropdownMenu.Trigger>
      {(combinedItems?.length ?? 0) > 0 && (
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {combinedItems?.map(({ label, onSelect }, i) => (
                <DropdownMenu.Item key={i} onSelect={() => onSelect(context as T)}>
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
// Section
//

type CardSectionProps = CardSharedProps & { indent?: boolean; icon?: string };

const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, classNames, className, role = 'none', indent, icon, ...props }, forwardedRef) => {
    return (
      <div
        {...props}
        role={role}
        className={mx((indent || icon) && styles.section, classNames, className)}
        ref={forwardedRef}
      >
        {(icon && <CardIcon classNames='text-subdued' icon={icon} />) || (indent && <div />)}
        {children}
      </div>
    );
  },
);

//
// Action
//

type CardActionProps = { icon: string; label: string; actionIcon?: string; onClick?: () => void };

const CardAction = ({ icon, actionIcon = 'ph--arrow-right--regular', label, onClick }: CardActionProps) => {
  return (
    <div className='pli-1'>
      <Button variant='ghost' classNames={mx(styles.toolbar, '!p-0 is-full text-start')} onClick={onClick}>
        <CardIcon classNames='text-subdued' icon={icon} />
        <span className={mx('min-is-0 flex-1 truncate', !onClick && 'col-span-2')}>{label}</span>
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
    <div className='pli-1'>
      <a
        className={mx(styles.toolbar, 'group dx-button dx-focus-ring !p-0 !min-bs-1 is-full')}
        data-variant='ghost'
        href={href}
        target='_blank'
        rel='noreferrer'
      >
        <CardIcon classNames='text-subdued' icon='ph--link--regular' />
        <span className={mx('min-is-0 flex-1 truncate')}>{label}</span>
        <CardIcon classNames='invisible group-hover:visible' icon='ph--arrow-square-out--regular' />
      </a>
    </div>
  );
};

//
// Icon
//

const CardIcon = (props: IconProps) => {
  return (
    <div role='none' className='grid bs-[var(--rail-item)] is-[var(--rail-item)] place-items-center'>
      <Icon {...props} />
    </div>
  );
};

//
// Chrome
//

/**
 * @deprecated Use Card.Section
 */
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
// Text
//

type CardProps = CardSharedProps & { valence?: 'description' };

const CardText = forwardRef<HTMLDivElement, CardProps>(
  ({ children, classNames, className, asChild, role = 'none', valence, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root
        {...props}
        role={role}
        className={mx('plb-1', valence === 'description' && 'plb-1.5', classNames, className)}
        ref={forwardedRef}
      >
        <span className={mx(valence === 'description' && 'text-sm text-description line-clamp-3')}>{children}</span>
      </Root>
    );
  },
);

//
// Card
//

export const Card = {
  Context: CardContext,
  Root: CardRoot,

  // Toolbar
  Toolbar: CardToolbar,
  ToolbarIconButton: CardToolbarIconButton, // TODO(burdon): Remove.
  ToolbarSeparator: CardToolbarSeparator, // TODO(burdon): Remove.
  DragHandle: CardDragHandle,
  Title: CardTitle,
  Menu: CardMenu,

  // Content
  Heading: CardHeading,
  Poster: CardPoster,
  Section: CardSection,
  Chrome: CardChrome, // TODO(burdon): Reconcile with Section.
  Text: CardText,
  Action: CardAction,
  Link: CardLink,
};

export type { CardContextValue, CardRootProps, CardMenuProps };
