//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { useMachine } from '@zag-js/react';
import React, { type AnchorHTMLAttributes, createContext, forwardRef, useContext, useId } from 'react';

import { composable, composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button } from '../Button/index.ts';
import { Separator, type SeparatorProps } from '../Separator/index.ts';
import { ToggleGroup, type ToggleGroupRootProps } from '../ToggleGroup/index.ts';
import * as toolbar from './toolbar-machine.ts';

// Optional by design: a control outside a toolbar renders without roving props.
const ToolbarContext = createContext<toolbar.ToolbarApi | undefined>(undefined);

/** Roving-focus props for a control inside a Toolbar; empty outside one. */
export const useToolbarItem = (disabled?: boolean) => {
  const api = useContext(ToolbarContext);
  const value = useId();
  return api?.getItemProps({ value, disabled });
};

//
// Root
//

type ToolbarRootProps = {
  size?: Size;
  orientation?: toolbar.Orientation;
  /** Arrow keys wrap from the last item to the first and back; on by default. */
  loop?: boolean;
  /** Disables every control in the toolbar. */
  disabled?: boolean;
};

/** `role=toolbar` with the roving focus that role promises (decision 9). */
const ToolbarRoot = slottable<HTMLDivElement, ToolbarRootProps>(
  ({ children, asChild, size, orientation = 'horizontal', loop = true, disabled, ...props }, forwardedRef) => {
    const service = useMachine(toolbar.machine, { id: useId(), orientation, loop, disabled });
    const api = toolbar.connect(service);
    const { className, ...rest } = composableProps(props, { classNames: recipes.toolbar() });
    return (
      <ToolbarContext.Provider value={api}>
        <ark.div
          asChild={asChild}
          {...rest}
          {...api.getRootProps()}
          data-size={size}
          className={className}
          ref={forwardedRef}
        >
          {children}
        </ark.div>
      </ToolbarContext.Provider>
    );
  },
);

ToolbarRoot.displayName = 'Next.Toolbar.Root';

//
// Separator
//

type ToolbarSeparatorProps = Omit<SeparatorProps, 'orientation'>;

/** A rule across the toolbar's axis (vertical in a horizontal toolbar); not an item, so roving focus skips it. */
const ToolbarSeparator = composable<HTMLDivElement, ToolbarSeparatorProps>((props, forwardedRef) => {
  const api = useContext(ToolbarContext);
  return (
    <Separator
      {...props}
      orientation={api?.orientation === 'vertical' ? 'horizontal' : 'vertical'}
      ref={forwardedRef}
    />
  );
});

ToolbarSeparator.displayName = 'Next.Toolbar.Separator';

//
// Text
//

type ToolbarTextProps = {};

/** A run of text that takes the free space and truncates; not an item, so roving focus skips it. */
const ToolbarText = slottable<HTMLDivElement, ToolbarTextProps>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.toolbarText() });
  return (
    <ark.div asChild={asChild} {...rest} data-scope='toolbar' data-part='text' className={className} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

ToolbarText.displayName = 'Next.Toolbar.Text';

//
// Link
//

type ToolbarLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/** A link that is a toolbar item (roving focus); opens in a new tab by default, like the current `Link`. */
const ToolbarLink = composable<HTMLAnchorElement, ToolbarLinkProps>(
  ({ children, target = '_blank', rel = 'noreferrer', onFocus, onClick, ...props }, forwardedRef) => {
    const { disabled, ...toolbarItem } = useToolbarItem() ?? { disabled: undefined, onFocus: undefined };
    const { className, ...rest } = composableProps<HTMLAnchorElement>(props, { classNames: recipes.toolbarLink() });
    return (
      <a
        {...rest}
        {...toolbarItem}
        target={target}
        rel={rel}
        aria-disabled={disabled}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem.onFocus?.();
        }}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        data-scope='toolbar'
        data-part='link'
        className={className}
        ref={forwardedRef}
      >
        {children}
      </a>
    );
  },
);

ToolbarLink.displayName = 'Next.Toolbar.Link';

//
// DragHandle
//

type ToolbarDragHandleProps = {
  /** Names the handle for assistive tech; required, since Next ships no translated defaults (AUDIT 2.10). */
  'label': string;
  'data-testid'?: string;
};

/**
 * A ghost icon-only Button with the six-dot grip for a drag-and-drop source to bind. It stays out of the roving focus
 * (dragging is a pointer gesture) and shows no Tooltip.
 */
const ToolbarDragHandle = forwardRef<HTMLButtonElement, ToolbarDragHandleProps>(
  ({ label, 'data-testid': testId }, forwardedRef) => (
    <ToolbarContext.Provider value={undefined}>
      <Button
        icon='ph--dots-six-vertical--regular'
        label={label}
        iconOnly
        showTooltip={false}
        variant='ghost'
        tabIndex={-1}
        data-drag-handle=''
        data-testid={testId}
        ref={forwardedRef}
      />
    </ToolbarContext.Provider>
  ),
);

ToolbarDragHandle.displayName = 'Next.Toolbar.DragHandle';

//
// ToggleGroup
//

type ToolbarToggleGroupProps = ToggleGroupRootProps;

/** A ToggleGroup whose items join the toolbar's roving focus, so the group adds no tab stop or arrow handling of its own. */
const ToolbarToggleGroup = forwardRef<HTMLDivElement, ToolbarToggleGroupProps>((props, forwardedRef) => (
  <ToggleGroup.Root {...props} rovingFocus={false} ref={forwardedRef} />
));

ToolbarToggleGroup.displayName = 'Next.Toolbar.ToggleGroup';

export const Toolbar = {
  Root: ToolbarRoot,
  Text: ToolbarText,
  Link: ToolbarLink,
  DragHandle: ToolbarDragHandle,
  Separator: ToolbarSeparator,
  ToggleGroup: ToolbarToggleGroup,
  ToggleGroupItem: ToggleGroup.Item,
};

export type {
  ToolbarDragHandleProps,
  ToolbarLinkProps,
  ToolbarRootProps,
  ToolbarSeparatorProps,
  ToolbarTextProps,
  ToolbarToggleGroupProps,
};
