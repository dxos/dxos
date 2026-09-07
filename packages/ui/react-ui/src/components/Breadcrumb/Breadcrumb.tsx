//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';
import { Link, type LinkProps } from '../Link';

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

type BreadcrumbLinkProps = LinkProps;

const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>((props, forwardedRef) => {
  return <Link {...props} ref={forwardedRef} />;
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
      {children ?? <Icon icon='ph--caret-double-right--regular' />}
    </ark.span>
  );
}

BreadcrumbSeparator.displayName = 'Breadcrumb.Separator';

export const Breadcrumb = {
  Root: BreadcrumbRoot,
  List: BreadcrumbList,
  ListItem: BreadcrumbListItem,
  Link: BreadcrumbLink,
  Current: BreadcrumbCurrent,
  Separator: BreadcrumbSeparator,
};

export type {
  BreadcrumbCurrentProps,
  BreadcrumbLinkProps,
  BreadcrumbListItemProps,
  BreadcrumbListProps,
  BreadcrumbRootProps,
  BreadcrumbSeparatorProps,
};
