//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import * as Icon from '../Icon/Icon.tsx';
import * as Link from '../Link/Link.tsx';
type BreadcrumbRootProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  'aria-label': string;
  'asChild'?: boolean;
};

const BreadcrumbRoot = forwardRef<HTMLDivElement, BreadcrumbRootProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.div
        asChild={asChild}
        role='navigation'
        {...props}
        className={tx('breadcrumb.root', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

BreadcrumbRoot.displayName = 'Breadcrumb.Root';

type BreadcrumbListProps = ThemedClassName<ComponentPropsWithRef<typeof ark.ol>> & { asChild?: boolean };

const BreadcrumbList = forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.ol
        asChild={asChild}
        role='list'
        {...props}
        className={tx('breadcrumb.list', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

BreadcrumbList.displayName = 'Breadcrumb.List';

type BreadcrumbListItemProps = ThemedClassName<ComponentPropsWithRef<typeof ark.li>> & { asChild?: boolean };

const BreadcrumbListItem = forwardRef<HTMLLIElement, BreadcrumbListItemProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.li
        asChild={asChild}
        role='listitem'
        {...props}
        className={tx('breadcrumb.listItem', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

BreadcrumbListItem.displayName = 'Breadcrumb.ListItem';

type BreadcrumbLinkProps = Link.RootProps;

const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>((props, forwardedRef) => {
  return <Link.Root {...props} ref={forwardedRef} />;
});

BreadcrumbLink.displayName = 'Breadcrumb.Link';

type BreadcrumbCurrentProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & { asChild?: boolean };

const BreadcrumbCurrent = forwardRef<HTMLHeadingElement, BreadcrumbCurrentProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.h1
        asChild={asChild}
        {...props}
        aria-current='page'
        className={tx('breadcrumb.current', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

BreadcrumbCurrent.displayName = 'Breadcrumb.Current';

type BreadcrumbSeparatorProps = ThemedClassName<ComponentPropsWithoutRef<typeof ark.span>>;

function BreadcrumbSeparator({ classNames, children, ...props }: BreadcrumbSeparatorProps) {
  const { tx } = useThemeContext();
  return (
    <ark.span role='separator' aria-hidden='true' {...props} className={tx('breadcrumb.separator', {}, classNames)}>
      {children ?? <Icon.Root icon='ph--caret-double-right--regular' />}
    </ark.span>
  );
}

BreadcrumbSeparator.displayName = 'Breadcrumb.Separator';
export type {
  BreadcrumbCurrentProps as CurrentProps,
  BreadcrumbLinkProps as LinkProps,
  BreadcrumbListItemProps as ListItemProps,
  BreadcrumbListProps as ListProps,
  BreadcrumbRootProps as RootProps,
  BreadcrumbSeparatorProps as SeparatorProps,
};

export {
  BreadcrumbCurrent as Current,
  BreadcrumbLink as Link,
  BreadcrumbList as List,
  BreadcrumbListItem as ListItem,
  BreadcrumbRoot as Root,
  BreadcrumbSeparator as Separator,
};
export * from './Breadcrumb.theme.ts';
