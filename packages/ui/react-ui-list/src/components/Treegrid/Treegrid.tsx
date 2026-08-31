//
// Copyright 2024 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithRef, type CSSProperties, type KeyboardEvent, useCallback } from 'react';

import { findFirstFocusable } from '@dxos/react-focus';
import { type ThemedClassName, composable, composableProps, slottable } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { treegridTheme } from './Treegrid.theme';

// TODO(thure): https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/treegrid_role

const styles = treegridTheme.styles();

const TREEGRID_ROW_NAME = 'Treegrid.Row';

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
  gridTemplateColumns?: CSSProperties['gridTemplateColumns'];
  asChild?: boolean;
};

const TreegridRoot = composable<HTMLDivElement, TreegridRootProps>(
  ({ asChild, classNames, children, style, gridTemplateColumns, onKeyDown: onKeyDownProp, ...props }, forwardedRef) => {
    const { className, role: _role, ...rest } = composableProps<HTMLDivElement>(props, { classNames });
    const Comp = asChild ? Slot : Primitive.div;

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
      [onKeyDownProp],
    );

    return (
      <Comp
        role='treegrid'
        {...rest}
        className={styles.root({ class: mx(className) })}
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

const TreegridRow = slottable<HTMLDivElement, TreegridRowScopedProps<TreegridRowProps>>(
  (
    {
      __treegridRowScope,
      asChild,
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
          {...composableProps<HTMLDivElement>(props, {
            classNames: styles.row({ class: treegridTheme.rowLevel(level) }),
            role: 'row',
          })}
          aria-level={level}
          {...(parentOf && { 'aria-expanded': open, 'aria-owns': parentOf })}
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

const TreegridCell = composable<HTMLDivElement, TreegridCellProps>(({ children, indent, ...props }, forwardedRef) => {
  return (
    <div
      {...composableProps<HTMLDivElement>(props, { classNames: styles.cell({ indent }), role: 'gridcell' })}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

export type { TreegridRootProps, TreegridRowProps };

export const Treegrid = {
  Root: TreegridRoot,
  Row: TreegridRow,
  Cell: TreegridCell,
};
