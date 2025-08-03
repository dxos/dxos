//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, type ComponentPropsWithoutRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';
import { Link, type LinkProps } from '../Link';

type BreadcrumbRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  'aria-label': string;
  asChild?: boolean;
};

const BreadcrumbRoot = forwardRef<HTMLDivElement, BreadcrumbRootProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        role='navigation'
        {...props}
        className={tx('breadcrumb.root', 'breadcrumb', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type BreadcrumbListProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.ol>> & { asChild?: boolean };

const BreadcrumbList = forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.ol;
    return (
      <Root
        role='list'
        {...props}
        className={tx('breadcrumb.list', 'breadcrumb__list', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type BreadcrumbListItemProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.li>> & { asChild?: boolean };

const BreadcrumbListItem = forwardRef<HTMLLIElement, BreadcrumbListItemProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.li;
    return (
      <Root
        role='listitem'
        {...props}
        className={tx('breadcrumb.listItem', 'breadcrumb__list__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type BreadcrumbLinkProps = LinkProps;

const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(({ asChild, ...props }, forwardedRef) => {
  const Root = asChild ? Slot : Link;
  return <Root {...props} ref={forwardedRef} />;
});

type BreadcrumbCurrentProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & { asChild?: boolean };

const BreadcrumbCurrent = forwardRef<HTMLHeadingElement, BreadcrumbCurrentProps>(
  ({ asChild, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'h1';
    return (
      <Root
        {...props}
        aria-current='page'
        className={tx('breadcrumb.current', 'breadcrumb__item__heading--current', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type BreadcrumbSeparatorProps = ThemedClassName<ComponentPropsWithoutRef<typeof Primitive.span>>;

const BreadcrumbSeparator = ({ children, classNames, ...props }: BreadcrumbSeparatorProps) => {
  const { tx } = useThemeContext();
  return (
    <Primitive.span
      role='separator'
      aria-hidden='true'
      {...props}
      className={tx('breadcrumb.separator', 'breadcrumb__separator', {}, classNames)}
    >
      {children ?? <Icon icon='ph--dot--bold' />}
    </Primitive.span>
  );
};

export const Breadcrumb = {
  Root: BreadcrumbRoot,
  List: BreadcrumbList,
  ListItem: BreadcrumbListItem,
  Link: BreadcrumbLink,
  Current: BreadcrumbCurrent,
  Separator: BreadcrumbSeparator,
};

export type {
  BreadcrumbRootProps,
  BreadcrumbListProps,
  BreadcrumbListItemProps,
  BreadcrumbLinkProps,
  BreadcrumbCurrentProps,
  BreadcrumbSeparatorProps,
};
