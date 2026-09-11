//
// Copyright 2026 DXOS.org
//

// `Toc` — a table of contents on Ark's toc machine, which watches the headings of a rendered
// document (by `id`, through an `IntersectionObserver`) and marks the links to the ones in view.
// Items are `{ value, depth }`: the heading's id and its level; the link's text is the consumer's.

import { type TocItemData, Toc as TocPrimitive } from '@ark-ui/react/toc';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';

//
// Root
//

type TocRootProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Root>>;

/**
 * Owns the machine: `items`, the optional `scrollEl` the document scrolls in (the viewport
 * otherwise), `activeIds`/`defaultActiveIds`/`onActiveChange`, `rootMargin`, `threshold`,
 * `autoScroll` and `scrollBehavior`. Publishes the indicator's rect as `--top`/`--height`.
 */
const TocRoot = forwardRef<HTMLDivElement, TocRootProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Root {...props} className={tx('toc.root', {}, classNames)} ref={forwardedRef} />;
});

TocRoot.displayName = 'Toc.Root';

//
// Content
//

type TocContentProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Content>>;

/** The document the headings live in; an `article`. */
const TocContent = forwardRef<HTMLElement, TocContentProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Content {...props} className={tx('toc.content', {}, classNames)} ref={forwardedRef} />;
});

TocContent.displayName = 'Toc.Content';

//
// Nav
//

type TocNavProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Nav>>;

/** The landmark holding the title and list; labelled by the title. */
const TocNav = forwardRef<HTMLElement, TocNavProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Nav {...props} className={tx('toc.nav', {}, classNames)} ref={forwardedRef} />;
});

TocNav.displayName = 'Toc.Nav';

//
// Title
//

type TocTitleProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Title>>;

const TocTitle = forwardRef<HTMLHeadingElement, TocTitleProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Title {...props} className={tx('toc.title', {}, classNames)} ref={forwardedRef} />;
});

TocTitle.displayName = 'Toc.Title';

//
// List
//

type TocListProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.List>>;

/** The positioned ancestor of the indicator: the machine measures item offsets against it. */
const TocList = forwardRef<HTMLUListElement, TocListProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.List {...props} className={tx('toc.list', {}, classNames)} ref={forwardedRef} />;
});

TocList.displayName = 'Toc.List';

//
// Indicator
//

type TocIndicatorProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Indicator>>;

/** A bar beside the active items, spanning from the first to the last; hidden when none is active. */
const TocIndicator = forwardRef<HTMLDivElement, TocIndicatorProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Indicator {...props} className={tx('toc.indicator', {}, classNames)} ref={forwardedRef} />;
});

TocIndicator.displayName = 'Toc.Indicator';

//
// Item
//

type TocItemProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Item>>;

/** One heading; indented by its depth through `--depth`. */
const TocItem = forwardRef<HTMLLIElement, TocItemProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Item {...props} className={tx('toc.item', {}, classNames)} ref={forwardedRef} />;
});

TocItem.displayName = 'Toc.Item';

//
// Link
//

type TocLinkProps = ThemedClassName<ComponentPropsWithRef<typeof TocPrimitive.Link>>;

/**
 * The anchor. Given a `scrollEl`, a click scrolls the heading into view and pushes the hash rather
 * than letting the browser jump; `href` should be `#<value>`.
 */
const TocLink = forwardRef<HTMLAnchorElement, TocLinkProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TocPrimitive.Link {...props} className={tx('toc.link', {}, classNames)} ref={forwardedRef} />;
});

TocLink.displayName = 'Toc.Link';

//
// Toc
//

export const Toc = {
  Root: TocRoot,
  Content: TocContent,
  Nav: TocNav,
  Title: TocTitle,
  List: TocList,
  Indicator: TocIndicator,
  Item: TocItem,
  Link: TocLink,
};

export type {
  TocContentProps,
  TocIndicatorProps,
  TocItemData,
  TocItemProps,
  TocLinkProps,
  TocListProps,
  TocNavProps,
  TocRootProps,
  TocTitleProps,
};
