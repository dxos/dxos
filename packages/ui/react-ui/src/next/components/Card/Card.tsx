//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Container } from '../Container/index.ts';
import { Group } from '../Group/index.ts';
import { Image, type ImageProps } from '../Image/index.ts';

//
// Root
//

type CardRootProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/**
 * A `gutter='md'` Container one level above its host (`level='+1'`), so Header, Body and Footer share one content
 * edge. The child div wins the `asChild` merge, so the part keeps the card scope.
 */
const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(({ classNames, ...props }, forwardedRef) => (
  <Container asChild gutter='md' level='+1'>
    <div
      {...props}
      data-scope='card'
      data-part='root'
      className={mx(recipes.cardRoot(), classNames)}
      ref={forwardedRef}
    />
  </Container>
));

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

/** A block row holding the Title and optional trailing Blocks or IconButtons. */
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

export const Card = {
  Root: CardRoot,
  Poster: CardPoster,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
};

export type {
  CardBodyProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardPosterProps,
  CardRootProps,
  CardTitleProps,
};
