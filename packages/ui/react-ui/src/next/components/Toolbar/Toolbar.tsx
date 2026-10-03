//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { useMachine } from '@zag-js/react';
import React, { type AnchorHTMLAttributes, type HTMLAttributes, forwardRef, useContext, useId } from 'react';

import { composable, composableProps, slottable } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { ScrollArea } from '../ScrollArea/index.ts';
import { Separator, type SeparatorProps } from '../Separator/index.ts';
import { ToggleGroup, type ToggleGroupRootProps } from '../ToggleGroup/index.ts';
import { ToolbarContext, useToolbarItem } from './toolbar-context.ts';
import * as toolbar from './toolbar-machine.ts';

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

/**
 * The toolbar element as a composable part, so the ScrollArea viewport slot merges onto it (a plain `ark.div` gets the
 * dev warning wrapper, which breaks the frame's child rules).
 */
const ToolbarElement = composable<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { asChild?: boolean }>(
  (props, forwardedRef) => <ark.div {...composableProps(props)} ref={forwardedRef} />,
);

/**
 * `role=toolbar` with the roving focus that role promises (decision 9); items that overflow scroll along its axis in a
 * thin ScrollArea whose bar shows on hover, the toolbar itself being the viewport.
 */
const ToolbarRoot = slottable<HTMLDivElement, ToolbarRootProps>(
  ({ children, asChild, size, orientation = 'horizontal', loop = true, disabled, ...props }, forwardedRef) => {
    const service = useMachine(toolbar.machine, { id: useId(), orientation, loop, disabled });
    const api = toolbar.connect(service);
    const { className, ...rest } = composableProps(props, { classNames: recipes.toolbar() });
    return (
      <ToolbarContext.Provider value={api}>
        <ScrollArea.Root
          size={size}
          width='thin'
          orientation={orientation}
          autoHide
          classNames={recipes.toolbarScroll()}
        >
          <ScrollArea.Viewport asChild>
            <ToolbarElement
              asChild={asChild}
              {...rest}
              {...api.getRootProps()}
              data-size={size}
              classNames={className}
              ref={forwardedRef}
            >
              {children}
            </ToolbarElement>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
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
  Separator: ToolbarSeparator,
  ToggleGroup: ToolbarToggleGroup,
};

export type { ToolbarLinkProps, ToolbarRootProps, ToolbarSeparatorProps, ToolbarTextProps, ToolbarToggleGroupProps };
