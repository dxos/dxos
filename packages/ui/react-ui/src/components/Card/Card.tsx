//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import DOMPurify from 'dompurify';
import React, { type ReactNode, CSSProperties, MouseEventHandler, forwardRef, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { iconSize } from '@dxos/ui-theme';
import { type Density, type SlottableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks';
import { composable, composableProps, slottable } from '../../util';
import { type ThemedClassName } from '../../util';
import { Button, IconButton } from '../Button';
import { Column } from '../Column';
import { Icon } from '../Icon';
import { type ImageProps, Image } from '../Image';
import { DropdownMenu } from '../Menu';
import { type ToolbarActionIconButtonProps, type ToolbarDragHandleProps, type ToolbarMenuProps } from '../Toolbar';

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
        gutter='lg'
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

type CardHeaderProps = SlottableProps;

/**
 * Top header row of a Card. Renders as a `<header>` and shares `Card.Row`'s subgrid +
 * `data-slot` layout: `Card.Block` children land in the gutters, anonymous children
 * (e.g. `Card.Title`) in the center. Sets `--icon-size` 5 — header icons are larger than
 * row icons (which use 4). Not a toolbar: most headers carry 0–1 controls, so `role="toolbar"`
 * was inaccurate; controls are reached by normal tab order.
 */
const CardHeader = slottable<HTMLDivElement, CardHeaderProps>(
  ({ children, asChild, style, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    // `@radix-ui/react-primitive` has no `header` node; the intrinsic element handles asChild via Slot.
    const Comp = asChild ? Slot : 'header';

    return (
      <Comp
        {...rest}
        style={{ ...iconSize(5), ...style }}
        className={tx('card.header', {}, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

CardHeader.displayName = CARD_HEADER_NAME;

//
// DragHandle
//

const CARD_DRAG_HANDLE_NAME = 'Card.DragHandle';

type CardDragHandleProps = ToolbarDragHandleProps;

const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>(
  ({ testId = 'drag-handle', label }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <CardBlock>
        <IconButton
          data-testid={testId}
          tabIndex={-1}
          noTooltip
          iconOnly
          icon='ph--dots-six-vertical--regular'
          variant='ghost'
          label={label ?? t('toolbar-drag-handle.label')}
          classNames='dx-focus-ring-none cursor-pointer text-base-fg'
          disabled={!forwardedRef}
          ref={forwardedRef}
        />
      </CardBlock>
    );
  },
);

CardDragHandle.displayName = CARD_DRAG_HANDLE_NAME;

//
// ActionIconButton
//

const CARD_ACTION_ICON_BUTTON_NAME = 'Card.ActionIconButton';

type CardActionIconButtonProps = ToolbarActionIconButtonProps;

const CARD_ACTION_ICONS = { close: 'ph--x--regular', delete: 'ph--trash--regular' } as const;

const CARD_ACTION_LABEL_KEYS = { close: 'toolbar-close.label', delete: 'toolbar-delete.label' } as const;

const CardActionIconButton = forwardRef<HTMLButtonElement, CardActionIconButtonProps>(
  ({ action, onClick, label }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <CardBlock end>
        <IconButton
          iconOnly
          icon={CARD_ACTION_ICONS[action]}
          variant='ghost'
          label={label ?? t(CARD_ACTION_LABEL_KEYS[action])}
          classNames='cursor-pointer'
          onClick={onClick}
          ref={forwardedRef}
        />
      </CardBlock>
    );
  },
);

CardActionIconButton.displayName = CARD_ACTION_ICON_BUTTON_NAME;

//
// Menu
//

const CARD_MENU_NAME = 'Card.Menu';

type CardMenuProps<T extends any | void = void> = ToolbarMenuProps<T>;

function CardMenu<T extends any | void = void>({ context, items }: CardMenuProps<T>) {
  const { t } = useTranslation(translationKey);
  return (
    <CardBlock end>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger disabled={!items?.length} asChild>
          <IconButton
            iconOnly
            variant='ghost'
            icon='ph--dots-three-vertical--regular'
            label={t('toolbar-menu.label')}
          />
        </DropdownMenu.Trigger>
        {(items?.length ?? 0) > 0 && (
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Viewport>
                {items?.map(({ label, onClick: onSelect }, index) => (
                  // `context` is the generic payload threaded to each handler; the cast is the
                  // generic boundary (T may be `void`, so `context` is typed `T | undefined`).
                  <DropdownMenu.Item key={index} onSelect={() => onSelect(context as T)}>
                    {label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Viewport>
              <DropdownMenu.Arrow />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </DropdownMenu.Root>
    </CardBlock>
  );
}

CardMenu.displayName = CARD_MENU_NAME;

//
// Block
//

const CARD_BLOCK_NAME = 'Card.Block';

type CardBlockProps = SlottableProps<{ end?: boolean; compact?: boolean; square?: boolean }>;

/**
 * Leading (default) or trailing (`end`) gutter slot of a Card row/header. Sized to the
 * rail-item square so a passive `<Icon>` aligns with an `IconButton`. Defaults text color to
 * `subdued` so a decorative `<Icon>` child needs no styling; interactive children set their own.
 */
const CardBlock = composable<HTMLDivElement, CardBlockProps>(({ children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);

  return (
    <Column.Block {...rest} classNames={tx('card.block', {}, className)} ref={forwardedRef}>
      {children}
    </Column.Block>
  );
});

CardBlock.displayName = CARD_BLOCK_NAME;

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

type CardRowProps = { fullWidth?: boolean };

/**
 * A row inside a Card.
 * - Default: spans all 3 columns as a subgrid; children align via `data-slot` — `Card.Block`
 *   lands in the gutters (start/end), anonymous children in the center. Sets `--icon-size` 4.
 * - `fullWidth`: spans all columns without a subgrid — children do their own internal layout;
 *   `Card.Block` placement is inert in this mode.
 */
const CardRow = slottable<HTMLDivElement, CardRowProps>(
  ({ children, asChild, fullWidth, style, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

    return (
      <Comp
        {...rest}
        style={{ ...iconSize(4), ...style }}
        className={tx('card.row', { fullWidth }, className)}
        ref={forwardedRef}
      >
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

// `onClick` is opted in explicitly: `ComposableProps` deliberately excludes event handlers, but the
// part spreads rest props onto its element, so the handler is forwarded at runtime.
type CardTextProps = {
  truncate?: boolean;
  variant?: 'default' | 'description';
  onClick?: MouseEventHandler<HTMLDivElement>;
};

const CardText = slottable<HTMLDivElement, CardTextProps>(
  ({ children, asChild, role, truncate, variant = 'default', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

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

type CardHtmlProps = { html?: string; variant?: 'default' | 'description' };

/**
 * Renders sanitized HTML content inside a card text slot.
 * Uses DOMPurify to prevent XSS from untrusted markup (e.g. RSS feed content).
 */
function CardHtml({ html = '', variant = 'default', ...props }: CardHtmlProps & ThemedClassName<object>) {
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
  } & Partial<{ image: string; icon: string }> &
    // The image-rendering props (`fit`, `crossOrigin`, color-extraction options) are forwarded to
    // the underlying `Image`. `src`/`alt`/`classNames` are owned by the poster.
    Omit<ImageProps, 'src' | 'alt' | 'classNames'>
>;

function CardPoster({
  classNames,
  alt,
  aspect: aspectProp,
  image,
  icon,
  fit = 'cover',
  ...imageProps
}: CardPosterProps) {
  const { tx } = useThemeContext();
  const aspect = aspectProp === 'auto' ? 'aspect-auto' : 'aspect-video';

  if (image) {
    return (
      <Image classNames={[tx('card.poster', {}), aspect, classNames]} src={image} alt={alt} fit={fit} {...imageProps} />
    );
  }

  if (icon) {
    return (
      <div role='image' className={tx('card.poster-icon', {}, [aspect, classNames])} aria-label={alt}>
        <Icon icon={icon} size={10} />
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
      {icon && (
        <CardBlock>
          <Icon icon={icon} size={4} />
        </CardBlock>
      )}
      <span className={tx('card.action-label', {})}>{label}</span>
      {actionIcon && (
        <CardBlock end>
          <Icon icon={actionIcon} size={4} />
        </CardBlock>
      )}
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
      <CardBlock>
        <Icon icon='ph--link--regular' size={4} />
      </CardBlock>
      <span className={tx('card.link-label', {})}>{label}</span>
      <CardBlock end classNames='invisible group-hover:visible'>
        <Icon icon='ph--arrow-square-out--regular' size={4} />
      </CardBlock>
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

  // Header / row parts
  Block: CardBlock,
  DragHandle: CardDragHandle,
  ActionIconButton: CardActionIconButton,
  Menu: CardMenu,
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
  CardActionIconButtonProps,
  CardBlockProps,
  CardDragHandleProps,
  CardHeaderProps,
  CardMenuProps,
  CardRootProps,
  CardSectionProps,
};
