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
import { DragHandle } from '../Toolbar/index.ts';
import { Typography } from '../Typography/index.ts';

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
};

/**
 * A `gutter='md'` Container one level above its host (`level='+1'`), so Header, Body and Footer share one content
 * edge. The child div wins the `asChild` merge, so the part keeps the card scope. With `onClick` the card is a button
 * (Enter and Space activate it); nested actions and menus stop their clicks reaching it.
 */
const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ classNames, border = true, selected, onClick, onKeyDown, ...props }, forwardedRef) => (
    <Container asChild gutter='md' level='+1'>
      <div
        {...props}
        {...clickableProps(onClick, onKeyDown)}
        aria-current={selected ? 'true' : undefined}
        data-scope='card'
        data-part='root'
        data-border={border ? undefined : 'false'}
        data-selected={selected ? '' : undefined}
        className={mx(recipes.cardRoot(), onClick && recipes.cardClickable(), classNames)}
        ref={forwardedRef}
      />
    </Container>
  ),
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

/** A block row holding the Title and optional trailing Blocks or icon-only Buttons. */
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

type CardTitleProps = ThemedClassName<ComponentPropsWithoutRef<'h3'>>;

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(({ classNames, ...props }, forwardedRef) => (
  <h3
    {...props}
    data-scope='card'
    data-part='title'
    className={mx(recipes.cardTitle(), classNames)}
    ref={forwardedRef}
  />
));

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

/** An inheriting (subgrid) Container, so its children sit in the card's content track. */
const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(({ classNames, ...props }, forwardedRef) => (
  <Container asChild>
    <div {...props} data-scope='card' data-part='body' className={mx(classNames)} ref={forwardedRef} />
  </Container>
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

/** An inheriting Container grouping rows under an optional caption, so its content keeps the card's edge. */
const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ classNames, title, children, ...props }, forwardedRef) => {
    const titleId = useId();
    return (
      <Container asChild>
        <div
          {...props}
          role={title ? 'group' : undefined}
          aria-labelledby={title ? titleId : undefined}
          data-scope='card'
          data-part='section'
          className={mx(classNames)}
          ref={forwardedRef}
        >
          {title && (
            <div id={titleId} data-scope='card' data-part='section-title' className={recipes.cardSectionTitle()}>
              {title}
            </div>
          )}
          {children}
        </div>
      </Container>
    );
  },
);

CardSection.displayName = 'Next.Card.Section';

//
// Row
//

type CardRowProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** Leading icon, in a block-sized cell, so the text of every row with an icon starts at the same x. */
  icon?: string;
  /** Trailing content (a Tag, a count, an action), kept whole while the text truncates. */
  trailing?: ReactNode;
  /** The chosen row of a set (`aria-current`). */
  current?: boolean;
};

/**
 * A block-tall row of icon, text and trailing content. With `onClick` the row is a button (Enter and Space activate
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
      data-icon={icon ? '' : undefined}
      className={mx(recipes.cardRow(), onClick && recipes.cardClickable(), classNames)}
      ref={forwardedRef}
    >
      {icon && (
        <Block>
          <Icon icon={icon} />
        </Block>
      )}
      <div data-scope='card' data-part='row-content' className={recipes.cardRowContent()}>
        {children}
      </div>
      {trailing != null && (
        <div data-scope='card' data-part='row-trailing' className={recipes.cardRowTrailing()}>
          {trailing}
        </div>
      )}
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

type CardActionProps = Omit<ButtonProps, 'iconOnly' | 'icon' | 'label' | 'children'> & {
  icon: string;
  /** Names the action and shows in its Tooltip. */
  label: string;
};

/** A ghost icon-only Button for a Header or Row; its click stays with it, never activating a clickable card. */
const CardAction = forwardRef<HTMLButtonElement, CardActionProps>(({ onClick, ...props }, forwardedRef) => (
  <Button
    variant='ghost'
    {...props}
    iconOnly
    onClick={(event) => {
      stopPropagation(event);
      onClick?.(event);
    }}
    ref={forwardedRef}
  />
));

CardAction.displayName = 'Next.Card.Action';

//
// Link
//

type CardLinkProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'a'>, 'children'>> & {
  label: string;
  href: string;
};

/** A row linking out: link icon, label and an external-link icon; opens in a new tab like the current `Card.Link`. */
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
      <Block>
        <Icon icon='ph--link--regular' />
      </Block>
      <span data-scope='card' data-part='row-content' className={recipes.cardRowContent()}>
        {label}
      </span>
      <Block>
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
  /** The portalled menu leaves the card's sized scope, so it takes its own size. */
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
  DragHandle,
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
