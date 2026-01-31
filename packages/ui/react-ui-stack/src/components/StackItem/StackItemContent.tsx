//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useStack, useStackItem } from '../StackContext';

export type StackItemContentProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'role' | 'scrollable'>> & {
  /**
   * This flag is required in order to clarify a developer experience that seemed like it needed extra boilerplate (`row-span-2`) or was buggy.
   * See the description of the StackItem.Content component itself for more information.
   */
  toolbar?: boolean;

  /**
   * Whether to provide for the layout of a statusbar after the content.
   */
  statusbar?: boolean;

  /**
   * Whether to support y-axis scrolling.
   */
  scrollable?: boolean;

  /**
   * Whether to set a certain aspect ratio on the content, including the toolbar and statusbar.
   * This is provided for convenience and consistency; it can instead be specified by the `classNames` or `style` props as needed.
   * @deprecated
   */
  size?: 'intrinsic' | 'video' | 'square';

  /**
   * Whether the consumer intends to do something custom and typical affordances should not apply.
   * @deprecated Replace with override for gridTempateRows.
   */
  // TODO(burdon): Factor out toolbar layout as aspect asChild.
  layoutManaged?: boolean;
};

/**
 * This component should be used by plugins for rendering content within a stack item (i.e., a “plank” or “section”).
 */
export const StackItemContent = forwardRef<HTMLDivElement, StackItemContentProps>(
  (
    { children, toolbar, statusbar, scrollable, size = 'intrinsic', layoutManaged, classNames, ...props },
    forwardedRef,
  ) => {
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
      [layoutManaged, toolbar, statusbar],
    );

    return (
      <div
        {...props}
        role='none'
        style={style}
        className={mx(
          'group grid grid-cols-[100%] density-coarse',
          stackItemSize === 'contain' && 'min-bs-0 overflow-hidden',
          size === 'video' ? 'aspect-video' : size === 'square' && 'aspect-square',
          scrollable ? 'min-bs-0 overflow-y-auto scrollbar-thin contain-layout' : 'overflow-hidden',
          role === 'section' &&
            toolbar &&
            '[&_.dx-toolbar]:sticky [&_.dx-toolbar]:z-[1] [&_.dx-toolbar]:block-start-0 [&_.dx-toolbar]:-mbe-px [&_.dx-toolbar]:min-is-0',
          toolbar && '[&>.dx-toolbar]:relative [&>.dx-toolbar]:border-be [&>.dx-toolbar]:border-subduedSeparator',
          classNames,
        )}
        data-popover-collision-boundary={true}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

StackItemContent.displayName = 'StackItemContent';
