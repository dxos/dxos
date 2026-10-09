//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Ark has no breadcrumb, so this follows the WAI-ARIA breadcrumb pattern with native elements: a labelled `<nav>`
// landmark around an ordered list, the last item marked `aria-current='page'`.

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import * as Icon from '../Icon/Icon.tsx';

//
// Root
//

type BreadcrumbRootProps = ThemedClassName<ComponentPropsWithRef<typeof ark.nav>> & {
  /** Names the landmark, e.g. "Breadcrumbs". */
  'aria-label': string;
};

/** The `<nav>` landmark holding the trail. */
const BreadcrumbRoot = forwardRef<HTMLElement, BreadcrumbRootProps>(({ classNames, ...props }, forwardedRef) => (
  <ark.nav
    {...props}
    data-scope='breadcrumb'
    data-part='root'
    className={mx(recipes.breadcrumb(), classNames)}
    ref={forwardedRef}
  />
));

BreadcrumbRoot.displayName = 'Breadcrumb.Root';

//
// List
//

type BreadcrumbListProps = ThemedClassName<ComponentPropsWithRef<typeof ark.ol>>;

/** The ordered trail, one row that scrolls sideways (without a scrollbar) when it overflows. */
const BreadcrumbList = forwardRef<HTMLOListElement, BreadcrumbListProps>(({ classNames, ...props }, forwardedRef) => (
  <ark.ol
    {...props}
    data-scope='breadcrumb'
    data-part='list'
    className={mx(recipes.breadcrumbList(), classNames)}
    ref={forwardedRef}
  />
));

BreadcrumbList.displayName = 'Breadcrumb.List';

//
// Item
//

type BreadcrumbItemProps = ThemedClassName<ComponentPropsWithRef<typeof ark.li>>;

/** One step of the trail, holding a Link or, last, the Current page. */
const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(({ classNames, ...props }, forwardedRef) => (
  <ark.li
    {...props}
    data-scope='breadcrumb'
    data-part='item'
    className={mx(recipes.breadcrumbItem(), classNames)}
    ref={forwardedRef}
  />
));

BreadcrumbItem.displayName = 'Breadcrumb.Item';

//
// Link
//

type BreadcrumbLinkProps = ThemedClassName<ComponentPropsWithRef<typeof ark.a>>;

/** An earlier step: an anchor, or with `asChild` a button for in-app navigation. Subdued until hovered. */
const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(({ classNames, ...props }, forwardedRef) => (
  <ark.a
    {...props}
    data-scope='breadcrumb'
    data-part='link'
    className={mx(recipes.breadcrumbLink(), classNames)}
    ref={forwardedRef}
  />
));

BreadcrumbLink.displayName = 'Breadcrumb.Link';

//
// Current
//

type BreadcrumbCurrentProps = ThemedClassName<ComponentPropsWithRef<typeof ark.span>>;

/** The page the reader is on (`aria-current='page'`); `asChild` puts the mark on the caller's own title element. */
const BreadcrumbCurrent = forwardRef<HTMLSpanElement, BreadcrumbCurrentProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <ark.span
      {...props}
      aria-current='page'
      data-scope='breadcrumb'
      data-part='current'
      className={mx(recipes.breadcrumbCurrent(), classNames)}
      ref={forwardedRef}
    />
  ),
);

BreadcrumbCurrent.displayName = 'Breadcrumb.Current';

//
// Separator
//

type BreadcrumbSeparatorProps = ThemedClassName<Omit<ComponentPropsWithRef<'li'>, 'children'>> & {
  /** Replaces the default caret. */
  icon?: string;
};

/** A decorative list item between steps, hidden from assistive tech so the list counts only steps. */
const BreadcrumbSeparator = forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ classNames, icon = 'ph--caret-right--regular', ...props }, forwardedRef) => (
    <li
      {...props}
      aria-hidden
      data-scope='breadcrumb'
      data-part='separator'
      className={mx(recipes.breadcrumbSeparator(), classNames)}
      ref={forwardedRef}
    >
      <Icon.Icon icon={icon} />
    </li>
  ),
);

BreadcrumbSeparator.displayName = 'Breadcrumb.Separator';
export type {
  BreadcrumbCurrentProps as CurrentProps,
  BreadcrumbItemProps as ItemProps,
  BreadcrumbLinkProps as LinkProps,
  BreadcrumbListProps as ListProps,
  BreadcrumbRootProps as RootProps,
  BreadcrumbSeparatorProps as SeparatorProps,
};

export {
  BreadcrumbCurrent as Current,
  BreadcrumbItem as Item,
  BreadcrumbLink as Link,
  BreadcrumbList as List,
  BreadcrumbRoot as Root,
  BreadcrumbSeparator as Separator,
};
