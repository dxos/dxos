//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack, useStackItem } from '../StackContext';

export type StackItemContentProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'role'>> & {
  /**
   * This flag is required in order to clarify a developer experience that seemed like it needed extra boilerplate
   * (`row-span-2`) or was buggy. See the description of the StackItem.Content component itself for more information.
   */
  toolbar?: boolean;

  /**
   * Whether to provide for the layout of a statusbar after the content.
   */
  statusbar?: boolean;

  /**
   * Whether the consumer intends to do something custom and typical affordances should not apply
   */
  layoutManaged?: boolean;

  /**
   * Whether to set a certain aspect ratio on the content, including the toolbar and statusbar. This is provided for
   * convenience and consistency; it can instead be specified by the `classNames` or `style` props as needed.
   */
  size?: 'intrinsic' | 'video' | 'square';
};

/**
 * This component should be used by plugins for rendering content within a stack item, a.k.a. a “plank” or “section”.
 * The `toolbar` flag must be provided since this component provides for the layout of content with the toolbar.
 */
export const StackItemContent = forwardRef<HTMLDivElement, StackItemContentProps>(
  ({ children, toolbar, statusbar, layoutManaged, classNames, size = 'intrinsic', ...props }, forwardedRef) => {
    const { size: stackItemSize } = useStack();
    const { role } = useStackItem();
    const style = useMemo(
      () =>
        layoutManaged
          ? {}
          : {
              gridTemplateRows: [
                ...(toolbar ? [role === 'section' ? 'calc(var(--toolbar-size) - 1px)' : 'var(--toolbar-size)'] : []),
                '1fr',
                ...(statusbar ? ['var(--statusbar-size)'] : []),
              ].join(' '),
            },
      [toolbar, statusbar, layoutManaged],
    );

    return (
      <div
        role='none'
        {...props}
        className={mx(
          'group grid grid-cols-[100%] density-coarse',
          stackItemSize === 'contain' && 'min-bs-0 overflow-hidden',
          size === 'video' ? 'aspect-video' : size === 'square' && 'aspect-square',
          toolbar && '[&>.dx-toolbar]:relative [&>.dx-toolbar]:border-be [&>.dx-toolbar]:border-subduedSeparator',
          role === 'section' &&
            toolbar &&
            '[&_.dx-toolbar]:sticky [&_.dx-toolbar]:z-[1] [&_.dx-toolbar]:block-start-0 [&_.dx-toolbar]:-mbe-px [&_.dx-toolbar]:min-is-0',
          classNames,
        )}
        style={style}
        data-popover-collision-boundary={true}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);
