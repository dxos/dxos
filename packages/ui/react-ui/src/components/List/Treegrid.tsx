//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type CSSProperties,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  forwardRef,
  useCallback,
} from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

// TODO(thure): https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/treegrid_role

const TREEGRID_ROW_NAME = 'TreegridRow';

type TreegridRowScopedProps<P> = P & { __treegridRowScope?: Scope };

const [createTreegridRowContext, createTreegridRowScope] = createContextScope(TREEGRID_ROW_NAME, []);

type TreegridRowContextValue = {
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
};

const [TreegridRowProvider, useTreegridRowContext] =
  createTreegridRowContext<TreegridRowContextValue>(TREEGRID_ROW_NAME);

// TODO(burdon): Replace with functions.
export const TREEGRID_PATH_SEPARATOR = '~';
export const TREEGRID_PARENT_OF_SEPARATOR = ' ';

type TreegridRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  gridTemplateColumns: CSSProperties['gridTemplateColumns'];
  asChild?: boolean;
};

const TreegridRoot = composable<HTMLDivElement, TreegridRootProps>(
  ({ asChild, classNames, children, style, gridTemplateColumns, onKeyDown: onKeyDownProp, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, role: _role, ...rest } = composableProps<HTMLDivElement>(props, { classNames });
    const Comp = asChild ? Slot : Primitive.div;
    const { findFirstFocusable } = useFocusFinders();

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowUp': {
            const direction = event.key === 'ArrowDown' ? 'down' : 'up';
            const target = event.target as HTMLElement;

            // Find ancestor with data-arrow-keys containing the relevant direction.
            const ancestorWithArrowKeys = target.closest(`[data-arrow-keys*="${direction}"], [data-arrow-keys="all"]`);

            // If no ancestor with data-arrow-keys found, proceed with row navigation.
            if (!ancestorWithArrowKeys) {
              // Find the closest row
              const currentRow = target.closest('[role="row"]');
              if (currentRow) {
                // Find the treegrid container.
                const treegrid = currentRow.closest('[role="treegrid"]');
                if (treegrid) {
                  // Get all rows in the treegrid.
                  const rows = Array.from(treegrid.querySelectorAll('[role="row"]'));
                  const currentIndex = rows.indexOf(currentRow as Element);

                  // Find next or previous row.
                  const nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
                  const targetRow = rows[nextIndex];

                  if (targetRow) {
                    // Focus the first focusable element in the target row.
                    const firstFocusable = findFirstFocusable(targetRow as HTMLElement);
                    if (firstFocusable) {
                      event.preventDefault();
                      firstFocusable.focus();
                    }
                  }
                }
              }
            }
            break;
          }
        }
        onKeyDownProp?.(event);
      },
      [findFirstFocusable, onKeyDownProp],
    );

    return (
      <Comp
        role='treegrid'
        {...rest}
        className={tx('treegrid.root', {}, className)}
        style={{ ...style, gridTemplateColumns }}
        onKeyDown={handleKeyDown}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

type TreegridRowProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  id: string;
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
      id,
      parentOf,
      open: propsOpen,
      defaultOpen,
      onOpenChange: propsOnOpenChange,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    const pathParts = id.split(TREEGRID_PATH_SEPARATOR);
    const level = pathParts.length - 1;
    const [open, onOpenChange] = useControllableState({
      prop: propsOpen,
      onChange: propsOnOpenChange,
      defaultProp: defaultOpen,
    });

    return (
      <TreegridRowProvider open={open} onOpenChange={onOpenChange} scope={__treegridRowScope}>
        <Comp
          role='row'
          aria-level={level}
          className={tx('treegrid.row', { level }, classNames)}
          {...(parentOf && { 'aria-expanded': open, 'aria-owns': parentOf })}
          {...props}
          id={id}
          ref={forwardedRef}
        >
          {children}
        </Comp>
      </TreegridRowProvider>
    );
  },
);

type TreegridCellProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & { indent?: boolean };

const TreegridCell = forwardRef<HTMLDivElement, TreegridCellProps>(
  ({ classNames, children, indent, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <div role='gridcell' className={tx('treegrid.cell', { indent }, classNames)} {...props} ref={forwardedRef}>
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
};
