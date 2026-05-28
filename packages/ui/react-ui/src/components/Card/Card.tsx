//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import DOMPurify from 'dompurify';
import React, {
  CSSProperties,
  MouseEventHandler,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useId,
  useMemo,
} from 'react';

import { iconSize } from '@dxos/ui-theme';
import { type Density } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composable, composableProps, slottable } from '../../util';
import { type ThemedClassName } from '../../util';
import { Button } from '../Button';
import { Column } from '../Column';
import { Icon, type IconProps } from '../Icon';
import { Image } from '../Image';
import {
  Toolbar,
  type ToolbarActionIconButtonProps,
  ToolbarDragHandleProps,
  type ToolbarMenuProps,
  type ToolbarRootProps,
} from '../Toolbar';

//
// Root
//

const CARD_ROOT_NAME = 'Card.Root';

type CardRootProps = {
  id?: string;
  border?: boolean;
  fullWidth?: boolean;
  density?: Density;
  style?: CSSProperties;
  tabIndex?: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
  'data-selected'?: boolean;
  'data-testid'?: string;
};

/**
 * `Card.Root` does not support `asChild`. The Column grid is the root element
 * (one `<div>` carrying both the `dx-card` and `dx-column-root` classes
 * instead of the previous outer-card + inner-column pair), so caller-provided
 * HTML attributes — `onClick`, `tabIndex`, `style`, `data-*`, `grid-template-rows`
 * overrides via `classNames` — land directly on the grid container.
 * Slot-parents (`Focus.Item asChild`, `Mosaic.Tile asChild`, etc.) continue to
 * work because `composable()` preserves the COMPOSABLE marker that slottable parents
 * check before warning, and Radix `Slot` merges the parent's props onto the inner
 * `<div>` exactly the way `slottable`'s `Slot`/`Primitive.div` branch did.
 */
const CardRoot = composable<HTMLDivElement, CardRootProps>(
  ({ children, id, role, border = true, fullWidth, density, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const { tx } = useThemeContext();

    return (
      <Column.Root
        asChild
        gutter={density === 'lg' ? 'lg' : density === 'sm' || density === 'xs' ? 'sm' : 'md'}
        classNames={tx('card.root', { border, fullWidth }, className)}
        role={role ?? 'group'}
      >
        <div {...rest} {...(id && { 'data-object-id': id })} ref={forwardedRef}>
          {children}
        </div>
      </Column.Root>
    );
  },
);

CardRoot.displayName = CARD_ROOT_NAME;

//
// Header
//

const CARD_HEADER_NAME = 'Card.Header';

type CardHeaderProps = ToolbarRootProps;

/**
 * Top "header" slot of a Card. Despite the name, this renders as an ARIA
 * toolbar (`role="toolbar"`) so its action children get keyboard navigation
 * for free — `<header>` is allowed to contain a toolbar.
 */
const CardHeader = composable<HTMLDivElement, CardHeaderProps>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();

  return (
    <Toolbar.Root {...props} style={iconSize(5)} classNames={[tx('card.header', {}), classNames]} ref={forwardedRef}>
      {children}
    </Toolbar.Root>
  );
});

CardHeader.displayName = CARD_HEADER_NAME;

//
// DragHandle
//

const CARD_DRAG_HANDLE_NAME = 'Card.DragHandle';

type CardDragHandleProps = ToolbarDragHandleProps;

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>((props, forwardedRef) => {
  return (
    <CardIconBlock padding>
      <Toolbar.DragHandle {...props} ref={forwardedRef} />
    </CardIconBlock>
  );
});

CardDragHandle.displayName = CARD_DRAG_HANDLE_NAME;

//
// ActionIconButton
//

const CARD_ACTION_ICON_BUTTON_NAME = 'Card.ActionIconButton';

type CardActionIconButtonProps = ToolbarActionIconButtonProps;

const CardActionIconButton = forwardRef<HTMLButtonElement, CardActionIconButtonProps>((props, forwardedRef) => {
  return (
    <CardIconBlock padding>
      <Toolbar.ActionIconButton {...props} ref={forwardedRef} />
    </CardIconBlock>
  );
});

CardActionIconButton.displayName = CARD_ACTION_ICON_BUTTON_NAME;

//
// Menu
//

const CARD_MENU_NAME = 'Card.Menu';

type CardMenuProps<T extends any | void = void> = ToolbarMenuProps<T>;

function CardMenu<T extends any | void = void>({ context, items, ...props }: CardMenuProps<T>) {
  return (
    <CardIconBlock padding>
      <Toolbar.Menu {...props} context={context} items={items ?? []} />
    </CardIconBlock>
  );
}

CardMenu.displayName = CARD_MENU_NAME;

//
// Icon
//

const CARD_ICON_NAME = 'Card.Icon';

function CardIcon(props: IconProps) {
  return (
    <CardIconBlock>
      <Icon {...props} />
    </CardIconBlock>
  );
}

CardIcon.displayName = CARD_ICON_NAME;

//
// IconBlock
//

const CARD_ICON_BLOCK_NAME = 'Card.IconBlock';

const CardIconBlock = forwardRef<HTMLDivElement, ThemedClassName<PropsWithChildren<{ padding?: boolean }>>>(
  ({ classNames, children, padding, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();

    return (
      <div {...props} className={tx('card.icon-block', { padding }, classNames)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

CardIconBlock.displayName = CARD_ICON_BLOCK_NAME;

//
// Title
//

const CARD_TITLE_NAME = 'Card.Title';

const CardTitle = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props, { role: 'heading' });
  const Comp = asChild ? Slot : Primitive.div;

  return (
    <Comp {...rest} className={tx('card.title', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

CardTitle.displayName = CARD_TITLE_NAME;

//
// Body
//

const CARD_BODY_NAME = 'Card.Body';

const CardBody = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();

  return (
    <Comp {...rest} className={tx('card.body', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

CardBody.displayName = CARD_BODY_NAME;

//
// Section
//

const CARD_SECTION_NAME = 'Card.Section';

type CardSectionProps = { title?: ReactNode };

/**
 * A labeled grouping of card content. `display: contents` keeps children aligned
 * to the Card's column grid (like `Card.Body`); when `title` is provided,
 * renders a subheading row at the top and exposes the group with
 * `role='group' aria-labelledby=…` for screen readers.
 */
const CardSection = slottable<HTMLDivElement, CardSectionProps>(
  ({ children, asChild, title, role, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    const titleId = useId();

    return (
      <Comp
        {...rest}
        role={role ?? (title ? 'group' : 'none')}
        aria-labelledby={title ? titleId : undefined}
        className={tx('card.section', {}, className)}
        ref={forwardedRef}
      >
        {title && (
          <div id={titleId} className={tx('card.section-title', {})}>
            {title}
          </div>
        )}
        {children}
      </Comp>
    );
  },
);

CardSection.displayName = CARD_SECTION_NAME;

//
// Row
//

const CARD_ROW_NAME = 'Card.Row';

type CardRowProps = { icon?: string; fullWidth?: boolean };

/**
 * A row inside a Card.
 * - Default: spans all 3 columns and establishes a subgrid so children align to the Card's columns.
 *   An optional `icon` lands in the first column; when omitted, the first column is left empty.
 * - `fullWidth`: spans all columns without a subgrid — children do their own internal layout.
 *   The `icon` prop is ignored in this mode.
 */
const CardRow = slottable<HTMLDivElement, CardRowProps>(
  ({ children, asChild, icon, fullWidth, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();

    return (
      <Comp {...rest} className={tx('card.row', { fullWidth }, className)} ref={forwardedRef}>
        {!fullWidth && (icon ? <CardIcon classNames='text-subdued' icon={icon} size={4} /> : <div />)}
        {children}
      </Comp>
    );
  },
);

CardRow.displayName = CARD_ROW_NAME;

//
// Text
//

const CARD_TEXT_NAME = 'Card.Text';

type CardTextProps = { truncate?: boolean; variant?: 'default' | 'description' };

const CardText = slottable<HTMLDivElement, CardTextProps>(
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

CardText.displayName = CARD_TEXT_NAME;

//
// Html
//

const CARD_HTML_NAME = 'Card.Html';

type CardHtmlProps = { html: string; variant?: 'default' | 'description' };

/**
 * Renders sanitized HTML content inside a card text slot.
 * Uses DOMPurify to prevent XSS from untrusted markup (e.g. RSS feed content).
 */
function CardHtml({ html, variant = 'default', ...props }: CardHtmlProps & ThemedClassName<object>) {
  const { tx } = useThemeContext();
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html]);

  return (
    <div
      {...props}
      className={tx('card.text', { variant })}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

CardHtml.displayName = CARD_HTML_NAME;

//
// Poster
//

const CARD_POSTER_NAME = 'Card.Poster';

type CardPosterProps = ThemedClassName<
  {
    alt: string;
    aspect?: 'video' | 'auto';
    /**
     * How the image fills the poster box. `'contain'` (default) preserves
     * aspect ratio and may letterbox; `'cover'` fills the box edge-to-edge,
     * cropping as needed. Forwarded to the underlying `Image`'s
     * `object-fit`.
     */
    fit?: 'contain' | 'cover';
  } & Partial<{ image: string; icon: string }>
>;

function CardPoster(props: CardPosterProps) {
  const { tx } = useThemeContext();
  const aspect = props.aspect === 'auto' ? 'aspect-auto' : 'aspect-video';

  if (props.image) {
    return (
      <div className='col-span-full'>
        <Image
          classNames={[tx('card.poster', {}), aspect, props.classNames]}
          src={props.image}
          alt={props.alt}
          fit={props.fit}
        />
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
}

CardPoster.displayName = CARD_POSTER_NAME;

//
// Action
//

const CARD_ACTION_NAME = 'Card.Action';

type CardActionProps = { icon?: string; label: string; actionIcon?: string; onClick?: () => void };

function CardAction({ icon, actionIcon = 'ph--arrow-right--regular', label, onClick }: CardActionProps) {
  const { tx } = useThemeContext();
  return (
    <Button variant='ghost' classNames={tx('card.action', {})} onClick={onClick}>
      {icon ? <CardIcon classNames='text-subdued' icon={icon} size={4} /> : <div />}
      <span className={tx('card.action-label', {}, !actionIcon ? 'col-span-2' : undefined)}>{label}</span>
      {actionIcon && <CardIcon icon={actionIcon} size={4} />}
    </Button>
  );
}

CardAction.displayName = CARD_ACTION_NAME;

//
// Link
//

const CARD_LINK_NAME = 'Card.Link';

type CardLinkProps = { label: string; href: string };

function CardLink({ label, href }: CardLinkProps) {
  const { tx } = useThemeContext();
  return (
    <a className={tx('card.link', {})} data-variant='ghost' href={href} target='_blank' rel='noreferrer'>
      <CardIcon classNames='text-subdued' icon='ph--link--regular' />
      <span className={tx('card.link-label', {})}>{label}</span>
      <CardIcon classNames='invisible group-hover:visible' icon='ph--arrow-square-out--regular' />
    </a>
  );
}

CardLink.displayName = CARD_LINK_NAME;

//
// Card
//

export const Card = {
  Root: CardRoot,

  // Header
  Header: CardHeader,

  // Header parts
  IconBlock: CardIconBlock,
  DragHandle: CardDragHandle,
  ActionIconButton: CardActionIconButton,
  Menu: CardMenu,
  Icon: CardIcon,
  Title: CardTitle,

  // Body
  Body: CardBody,
  Section: CardSection,
  Row: CardRow,

  // Body parts
  Text: CardText,
  Html: CardHtml,
  Poster: CardPoster,
  Action: CardAction,
  Link: CardLink,
};

export type {
  CardRootProps,
  CardHeaderProps,
  CardDragHandleProps,
  CardActionIconButtonProps,
  CardMenuProps,
  CardSectionProps,
};
