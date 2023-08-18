//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { Link, LinkProps } from '../Link';

type BreadcrumbRootProps = ComponentPropsWithRef<typeof Primitive.div> & { 'aria-label': string; asChild?: boolean };

const BreadcrumbRoot = forwardRef<HTMLDivElement, BreadcrumbRootProps>(({ asChild, ...props }, forwardedRef) => {
  const Root = asChild ? Slot : Primitive.div;
  return <Root role='navigation' {...props} ref={forwardedRef} />;
});

type BreadcrumbListProps = ComponentPropsWithRef<typeof Primitive.ol> & { asChild?: boolean };

const BreadcrumbList = forwardRef<HTMLOListElement, BreadcrumbListProps>(({ asChild, ...props }, forwardedRef) => {
  const Root = asChild ? Slot : Primitive.ol;
  return <Root {...props} ref={forwardedRef} />;
});

type BreadcrumbListItemProps = ComponentPropsWithRef<typeof Primitive.li> & { asChild?: boolean };

const BreadcrumbListItem = forwardRef<HTMLLIElement, BreadcrumbListItemProps>(({ asChild, ...props }, forwardedRef) => {
  const Root = asChild ? Slot : Primitive.li;
  return <Root {...props} ref={forwardedRef} />;
});

type BreadcrumbLinkProps = LinkProps;

const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(({ ...props }, forwardedRef) => {
  return <Link {...props} ref={forwardedRef} />;
});

type BreadcrumbCurrentProps = ComponentPropsWithRef<'h1'> & { asChild?: boolean };

const BreadcrumbCurrent = forwardRef<HTMLHeadingElement, BreadcrumbCurrentProps>(
  ({ asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'h1';
    return <Root {...props} aria-current='page' ref={forwardedRef} />;
  },
);

export const Breadcrumb = {
  Root: BreadcrumbRoot,
  List: BreadcrumbList,
  ListItem: BreadcrumbListItem,
  Link: BreadcrumbLink,
  Current: BreadcrumbCurrent,
};

export type {
  BreadcrumbRootProps,
  BreadcrumbListProps,
  BreadcrumbListItemProps,
  BreadcrumbLinkProps,
  BreadcrumbCurrentProps,
};
