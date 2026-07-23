//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';
import { Link, type LinkProps } from '../Link';

type BreadcrumbRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  'aria-label': string;
  'asChild'?: boolean;
};

const BreadcrumbRoot = forwardRef<HTMLDivElement, BreadcrumbRootProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return <Comp role='navigation' {...props} className={tx('breadcrumb.root', {}, classNames)} ref={forwardedRef} />;
  },
);

BreadcrumbRoot.displayName = 'Breadcrumb.Root';

type BreadcrumbListProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.ol>> & { asChild?: boolean };

const BreadcrumbList = forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.ol;
    return <Comp role='list' {...props} className={tx('breadcrumb.list', {}, classNames)} ref={forwardedRef} />;
  },
);

BreadcrumbList.displayName = 'Breadcrumb.List';

type BreadcrumbListItemProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.li>> & { asChild?: boolean };

const BreadcrumbListItem = forwardRef<HTMLLIElement, BreadcrumbListItemProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.li;
    return <Comp role='listitem' {...props} className={tx('breadcrumb.listItem', {}, classNames)} ref={forwardedRef} />;
  },
);

BreadcrumbListItem.displayName = 'Breadcrumb.ListItem';

type BreadcrumbLinkProps = LinkProps;

const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(({ asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Link;
  return <Comp {...props} ref={forwardedRef} />;
});

BreadcrumbLink.displayName = 'Breadcrumb.Link';

type BreadcrumbCurrentProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & { asChild?: boolean };

const BreadcrumbCurrent = forwardRef<HTMLHeadingElement, BreadcrumbCurrentProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : 'h1';
    return (
      <Comp {...props} aria-current='page' className={tx('breadcrumb.current', {}, classNames)} ref={forwardedRef} />
    );
  },
);

BreadcrumbCurrent.displayName = 'Breadcrumb.Current';

type BreadcrumbSeparatorProps = ThemedClassName<ComponentPropsWithoutRef<typeof Primitive.span>>;

function BreadcrumbSeparator({ classNames, children, ...props }: BreadcrumbSeparatorProps) {
  const { tx } = useThemeContext();
  return (
    <Primitive.span
      role='separator'
      aria-hidden='true'
      {...props}
      className={tx('breadcrumb.separator', {}, classNames)}
    >
      {children ?? <Icon icon='ph--caret-double-right--regular' />}
    </Primitive.span>
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
