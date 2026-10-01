//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type MouseEvent, type ReactNode, forwardRef, useId } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { clickableProps } from '../../clickable.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Block } from '../Block/index.ts';
import { Button, type ButtonProps } from '../Button/index.ts';
import { Container } from '../Container/index.ts';
import { Group } from '../Group/index.ts';
import { Icon } from '../Icon/index.ts';
import { Image, type ImageProps } from '../Image/index.ts';
import { Menu } from '../Menu/index.ts';
import { SystemButton } from '../SystemButton/index.ts';
import { Typography, type TypographyProps } from '../Typography/index.ts';

/** A click inside a clickable card or row (a trailing action, a menu) must not also activate it. */
const stopPropagation = (event: MouseEvent) => event.stopPropagation();

//
// Root
//

type CardRootProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** The separator border and radius; `false` for a card inside a surface that already frames it. */
  border?: boolean;
  /** Marks the chosen card of a set (`data-selected`, `aria-current`). */
  selected?: boolean;
  /**
   * Makes the card a `gutter='rail'` Container: Body, Section and Row become subgrids of it, and a Header's or Row's
   * leading and trailing cells sit in its rails, one gap inside the border, so every text starts at the content edge.
   * Off by default: the card is a padded column, and rows lay their icon, text and trailing cells out inline.
   */
  grid?: boolean;
  /** Sizes the card's rows, blocks and controls (its `data-size` scope), whatever its host's size. */
  size?: Size;
};

/**
 * A card one level above its host (`level='+1'`), whose Header, Body and Footer share one content edge. With `grid` it
 * is a rail Container (the child div wins the `asChild` merge, so the part keeps the card scope); without, a plain
 * column that creates no grid. With `onClick` the card is a button (Enter and Space activate it); nested actions and
 * menus stop their clicks reaching it.
 */
const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ classNames, border = true, selected, grid = false, size, onClick, onKeyDown, ...props }, forwardedRef) => {
    const card = (
      <div
        data-surface={grid ? undefined : '+1'}
        {...props}
        data-size={size}
        {...clickableProps(onClick, onKeyDown)}
        aria-current={selected ? 'true' : undefined}
        data-scope='card'
        data-part='root'
        data-grid={grid ? '' : undefined}
        data-border={border ? undefined : 'false'}
        data-selected={selected ? '' : undefined}
        className={mx(recipes.cardRoot(), onClick && recipes.cardClickable(), classNames)}
        ref={forwardedRef}
      />
    );
    return grid ? (
      <Container asChild gutter='rail' level='+1'>
        {card}
      </Container>
    ) : (
      card
    );
  },
);

CardRoot.displayName = 'Next.Card.Root';

//
// Poster
//

type CardPosterProps = ImageProps;

/** A full-bleed Image across the card's gutters; first in the card, it takes the card's top corners. */
const CardPoster = forwardRef<HTMLDivElement, CardPosterProps>(({ classNames, ...props }, forwardedRef) => (
  <Image {...props} data-place='full' classNames={mx(recipes.cardPoster(), classNames)} ref={forwardedRef} />
));

CardPoster.displayName = 'Next.Card.Poster';

//
// Header
//

type CardHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/**
 * A block row across the card's rails holding the Title: a Block or icon-only Button before the Title fills the start
 * rail, and the last one after it the end rail, so the Title starts at the content edge.
 */
const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='card'
    data-part='header'
    className={mx(recipes.cardHeader(), classNames)}
    ref={forwardedRef}
  />
));

CardHeader.displayName = 'Next.Card.Header';

//
// Title
//

type CardTitleProps = ThemedClassName<ComponentPropsWithoutRef<'h3'>> &
  Pick<TypographyProps, 'truncate' | 'lines' | 'tone'>;

/** An `h3` on Typography, so it clamps (`lines`), truncates and takes a tone like any text. */
const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ classNames, truncate, lines, tone, ...props }, forwardedRef) => (
    <Typography asChild truncate={truncate} lines={lines} tone={tone} classNames={mx(recipes.cardTitle(), classNames)}>
      <h3 {...props} data-scope='card' data-part='title' ref={forwardedRef} />
    </Typography>
  ),
);

CardTitle.displayName = 'Next.Card.Title';

//
// Description
//

type CardDescriptionProps = ThemedClassName<ComponentPropsWithoutRef<'p'>>;

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <p
      {...props}
      data-scope='card'
      data-part='description'
      className={mx(recipes.cardDescription(), classNames)}
      ref={forwardedRef}
    />
  ),
);

CardDescription.displayName = 'Next.Card.Description';

//
// Body
//

type CardBodyProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** In a `grid` card a subgrid of it, so its children sit in the content track; otherwise a plain column. */
const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='card'
    data-part='body'
    className={mx(recipes.cardBody(), classNames)}
    ref={forwardedRef}
  />
));

CardBody.displayName = 'Next.Card.Body';

//
// Footer
//

type CardFooterProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** An end-justified `Next.Group` of actions in the content track. */
const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({ classNames, ...props }, forwardedRef) => (
  <Group asChild justify='end'>
    <div {...props} data-scope='card' data-part='footer' className={mx(classNames)} ref={forwardedRef} />
  </Group>
));

CardFooter.displayName = 'Next.Card.Footer';

//
// Section
//

type CardSectionProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** A caption heading the section; the section is then a `group` named by it. */
  title?: ReactNode;
};

/**
 * Groups rows under an optional caption; in a `grid` card a subgrid of it, so its rows keep the card's rails, otherwise
 * a plain column.
 */
const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ classNames, title, children, ...props }, forwardedRef) => {
    const titleId = useId();
    return (
      <div
        {...props}
        role={title ? 'group' : undefined}
        aria-labelledby={title ? titleId : undefined}
        data-scope='card'
        data-part='section'
        className={mx(recipes.cardSection(), classNames)}
        ref={forwardedRef}
      >
        {title && (
          <div id={titleId} data-scope='card' data-part='section-title' className={recipes.cardSectionTitle()}>
            {title}
          </div>
        )}
        {children}
      </div>
    );
  },
);

CardSection.displayName = 'Next.Card.Section';

//
// Row
//

type CardRowProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** Leading icon, in a Block in the card's start rail, so row text starts at the content edge with or without one. */
  icon?: string;
  /**
   * Trailing content (a Tag, a count, an action), kept whole while the text truncates; it ends in the card's end rail,
   * which an icon-only action fills, and a wider one extends back into the content track.
   */
  trailing?: ReactNode;
  /** The chosen row of a set (`aria-current`). */
  current?: boolean;
};

/**
 * A block-tall row of icon, text and trailing content, laid out inline; in a `grid` card it is a subgrid, so the icon
 * lands in the card's start rail, the text in its content track and the trailing content in its end rail. With `onClick` the row is a button (Enter and Space activate
 * it), as the current `Card.Action` row was.
 */
const CardRow = forwardRef<HTMLDivElement, CardRowProps>(
  ({ classNames, icon, trailing, current, onClick, onKeyDown, children, ...props }, forwardedRef) => (
    <div
      {...props}
      {...clickableProps(onClick, onKeyDown)}
      aria-current={current ? 'true' : undefined}
      data-scope='card'
      data-part='row'
      data-trailing={trailing != null ? '' : undefined}
      className={mx(recipes.cardRow(), onClick && recipes.cardClickable(), classNames)}
      ref={forwardedRef}
    >
      {icon && (
        <Block rail='start'>
          <Icon icon={icon} />
        </Block>
      )}
      <div data-scope='card' data-part='row-main' className={recipes.cardRowMain()}>
        <div data-scope='card' data-part='row-content' className={recipes.cardRowContent()}>
          {children}
        </div>
        {trailing != null && (
          <div data-scope='card' data-part='row-trailing' className={recipes.cardRowTrailing()}>
            {trailing}
          </div>
        )}
      </div>
    </div>
  ),
);

CardRow.displayName = 'Next.Card.Row';

//
// Text
//

type CardTextProps = ThemedClassName<ComponentPropsWithoutRef<'p'>> & {
  truncate?: boolean;
  /** `description` reads as secondary text. */
  variant?: 'default' | 'description';
};

/** Card text on Typography, with the current `Card.Text` variants. */
const CardText = forwardRef<HTMLParagraphElement, CardTextProps>(
  ({ classNames, truncate, variant = 'default', ...props }, forwardedRef) => (
    <Typography {...props} classNames={classNames} truncate={truncate} tone={variant} ref={forwardedRef} />
  ),
);

CardText.displayName = 'Next.Card.Text';

//
// Action
//

type CardActionProps = Omit<ButtonProps, 'iconOnly' | 'icon' | 'label' | 'children'> &
  (
    | {
        /** A `SystemButton` preset: its icon, and its translated label unless `label` is given. */
        system: 'close' | 'delete';
        icon?: never;
        label?: string;
      }
    | {
        system?: never;
        icon: string;
        /** Names the action and shows in its Tooltip. */
        label: string;
      }
  );

const CARD_ACTION_SYSTEM = { close: SystemButton.Close, delete: SystemButton.Delete } as const;

/**
 * A ghost icon-only Button for a Header or Row; its click stays with it, never activating a clickable card. With
 * `system` it is that `SystemButton` preset, so it takes the preset's icon and translated label.
 */
const CardAction = forwardRef<HTMLButtonElement, CardActionProps>(
  ({ system, icon, label, onClick, ...props }, forwardedRef) => {
    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      stopPropagation(event);
      onClick?.(event);
    };

    if (system) {
      const Preset = CARD_ACTION_SYSTEM[system];
      return <Preset variant='ghost' {...props} label={label} onClick={handleClick} ref={forwardedRef} />;
    }

    return (
      <Button variant='ghost' {...props} icon={icon} label={label} iconOnly onClick={handleClick} ref={forwardedRef} />
    );
  },
);

CardAction.displayName = 'Next.Card.Action';

//
// Link
//

type CardLinkProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'a'>, 'children'>> & {
  label: string;
  href: string;
};

/**
 * A row linking out, laid out like a Row: the link icon in the start rail, the label, and an external-link icon in the
 * end rail; opens in a new tab like the current `Card.Link`.
 */
const CardLink = forwardRef<HTMLAnchorElement, CardLinkProps>(
  ({ classNames, label, target = '_blank', rel = 'noreferrer', onClick, ...props }, forwardedRef) => (
    <a
      {...props}
      target={target}
      rel={rel}
      onClick={(event) => {
        stopPropagation(event);
        onClick?.(event);
      }}
      data-scope='card'
      data-part='link'
      className={mx(recipes.cardRow(), recipes.cardLink(), classNames)}
      ref={forwardedRef}
    >
      <Block rail='start'>
        <Icon icon='ph--link--regular' />
      </Block>
      <span data-scope='card' data-part='row-content' className={recipes.cardRowContent()}>
        {label}
      </span>
      <Block rail='end'>
        <Icon icon='ph--arrow-square-out--regular' />
      </Block>
    </a>
  ),
);

CardLink.displayName = 'Next.Card.Link';

//
// Menu
//

type CardMenuProps = {
  /** Names the trigger (and its Tooltip). */
  label: string;
  /** Overrides the menu's size, otherwise inherited from the trigger's nearest sized ancestor (Phase 4 decision 2). */
  size?: Size;
  /** `Menu.Item`s and friends. */
  children: ReactNode;
};

/** A ghost icon-only ⋮ trigger opening a Menu; neither the trigger nor a choice activates a clickable card. */
const CardMenu = ({ label, size, children }: CardMenuProps) => (
  <Menu.Root>
    <Menu.Trigger asChild>
      <Button
        icon='ph--dots-three-vertical--regular'
        label={label}
        iconOnly
        variant='ghost'
        onClick={stopPropagation}
      />
    </Menu.Trigger>
    <Menu.Content size={size} onClick={stopPropagation}>
      {children}
    </Menu.Content>
  </Menu.Root>
);

CardMenu.displayName = 'Next.Card.Menu';

export const Card = {
  Root: CardRoot,
  Poster: CardPoster,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
  Section: CardSection,
  Row: CardRow,
  Text: CardText,
  Action: CardAction,
  Link: CardLink,
  Menu: CardMenu,
};

export type {
  CardActionProps,
  CardBodyProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardLinkProps,
  CardMenuProps,
  CardPosterProps,
  CardRootProps,
  CardRowProps,
  CardSectionProps,
  CardTextProps,
  CardTitleProps,
};
