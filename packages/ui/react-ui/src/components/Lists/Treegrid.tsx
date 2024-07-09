//
// Copyright 2024 DXOS.org
//

import { createContextScope, type Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

// TODO(thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const TREEGRID_ROW_NAME = 'TreegridRow';

type TreegridRowScopedProps<P> = P & { __treegridRowScope?: Scope };

const [createTreegridRowContext, createTreegridRowScope] = createContextScope(TREEGRID_ROW_NAME, []);

type TreegridRowContextValue = {
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
};

const [TreegridRowProvider, useTreegridRowContext] =
  createTreegridRowContext<TreegridRowContextValue>(TREEGRID_ROW_NAME);

const PATH_SEPARATOR = '/';
const PARENT_OF_SEPARATOR = ' ';

type TreegridRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & { asChild?: boolean };

const TreegridRoot = forwardRef<HTMLDivElement, TreegridRootProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root role='treegrid' className={tx('treegrid.root', 'treegrid', {}, classNames)} {...props} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type TreegridRowProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  path: string;
  asChild?: boolean;
  parentOf?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?(open: boolean): void;
};

const TreegridRow = forwardRef<HTMLDivElement, TreegridRowScopedProps<TreegridRowProps>>(
  (
    {
      __treegridRowScope,
      asChild,
      classNames,
      children,
      path,
      parentOf,
      open: propsOpen,
      defaultOpen,
      onOpenChange: propsOnOpenChange,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    const pathParts = path.split(PATH_SEPARATOR);
    const level = pathParts.length;
    const [open, onOpenChange] = useControllableState({
      prop: propsOpen,
      onChange: propsOnOpenChange,
      defaultProp: defaultOpen,
    });
    return (
      <TreegridRowProvider open={open} onOpenChange={onOpenChange} scope={__treegridRowScope}>
        <Root
          role='row'
          id={pathParts[pathParts.length - 1]}
          data-path={path}
          aria-level={level}
          className={tx('treegrid.row', 'treegrid__row', { level }, classNames)}
          {...(parentOf && { 'aria-expanded': open, 'aria-owns': parentOf })}
          {...props}
          ref={forwardedRef}
        >
          {children}
        </Root>
      </TreegridRowProvider>
    );
  },
);

type TreegridCellProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>>;

const TreegridCell = forwardRef<HTMLDivElement, TreegridCellProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <div
        role='gridcell'
        className={tx('treegrid.row', 'treegrid__row', {}, classNames)}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

export type { TreegridRootProps, TreegridRowProps };

export const Treegrid = {
  Root: TreegridRoot,
  Row: TreegridRow,
  Cell: TreegridCell,
  PARENT_OF_SEPARATOR,
  PATH_SEPARATOR,
  createTreegridRowScope,
  useTreegridRowContext,
};
