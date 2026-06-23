//
// Copyright 2025 DXOS.org
//

import { composeRefs } from '@radix-ui/react-compose-refs';
import React, {
  Children,
  type ComponentPropsWithRef,
  type FocusEvent,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { ListItem, type ThemedClassName, useId } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { StackContext } from '../StackContext';
import { type StackContextValue } from '../types';
import { useKeyDown } from './useKeyDown';
import { useStackDropForElements } from './useStackDropForElements';

export const railGridHorizontal = 'grid-rows-[[rail-start]_var(--dx-rail-size)_[content-start]_1fr_[content-end]]';
export const railGridVertical = 'grid-cols-[[rail-start]_var(--dx-rail-size)_[content-start]_1fr_[content-end]]';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithRef<'div'>>, 'aria-orientation'> &
  Partial<StackContextValue> & {
    itemsCount?: number;
    circularFocus?: boolean;
    separatorOnScroll?: number;
    getDropElement?: (stackElement: HTMLDivElement) => HTMLDivElement;
  };

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      classNames,
      id,
      style,
      orientation = 'vertical',
      rail = true,
      size = 'intrinsic',
      itemsCount = Children.count(children),
      circularFocus,
      separatorOnScroll,
      getDropElement,
      onBlur,
      onKeyDown,
      onRearrange,
      ...props
    },
    forwardedRef,
  ) => {
    const stackId = useId('stack', id);
    const [stackElement, stackRef] = useState<HTMLDivElement | null>(null);
    const [lastFocusedItem, setLastFocusedItem] = useState<string>();
    const composedItemRef = composeRefs<HTMLDivElement>(stackRef, forwardedRef);

    const selfDroppable = !!(itemsCount < 1 && onRearrange && id);
    const { dropping } = useStackDropForElements({
      id,
      element: getDropElement && stackElement ? getDropElement(stackElement) : stackElement,
      scrollElement: stackElement,
      selfDroppable,
      orientation,
      onRearrange,
    });

    /** Updates scroll separator data attributes based on current scroll position. */
    const handleScroll = useCallback(() => {
      if (stackElement && Number.isFinite(separatorOnScroll)) {
        const scrollPosition = orientation === 'horizontal' ? stackElement.scrollLeft : stackElement.scrollTop;
        const scrollSize = orientation === 'horizontal' ? stackElement.scrollWidth : stackElement.scrollHeight;
        const clientSize = orientation === 'horizontal' ? stackElement.clientWidth : stackElement.clientHeight;
        const separatorHost = stackElement.closest('[data-scroll-separator]');
        if (separatorHost) {
          separatorHost.setAttribute('data-scroll-separator', String(scrollPosition > separatorOnScroll!));
          separatorHost.setAttribute(
            'data-scroll-separator-end',
            String(scrollSize - (scrollPosition + clientSize) > separatorOnScroll!),
          );
        }
      }
    }, [stackElement, separatorOnScroll, orientation]);

    /** Handles blur events to track the last focused item within this stack. */
    const handleBlur = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        if (event.target) {
          const target = event.target as HTMLElement;
          const closestStackItem = target.closest(`[data-dx-item-id]`) as HTMLElement | null;
          if (closestStackItem?.closest(`[data-dx-stack="${stackId}"]`)) {
            setLastFocusedItem(closestStackItem?.getAttribute('data-dx-item-id') ?? undefined);
          }
        }
        onBlur?.(event);
      },
      [stackId, onBlur],
    );

    /** Handles keyboard navigation within the stack. */
    const handleKeyDown = useKeyDown(stackId, circularFocus, onKeyDown);

    /** Observes DOM mutations to keep scroll separator state in sync. */
    useEffect(() => {
      if (!(stackElement && Number.isFinite(separatorOnScroll))) {
        return;
      }

      const observer = new MutationObserver(() => {
        handleScroll();
      });

      observer.observe(stackElement, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
      };
    }, [stackElement, handleScroll]);

    return (
      <StackContext.Provider value={{ stackId, orientation, rail, size, onRearrange }}>
        <div
          {...props}
          {...(Number.isFinite(separatorOnScroll) && { onScroll: handleScroll })}
          className={mx(
            'relative grid [--stack-gap:var(--spacing-trim-xs)]',
            size === 'contain' &&
              (orientation === 'horizontal'
                ? 'overflow-x-auto overscroll-x-contain min-h-0 max-h-full h-full'
                : 'overflow-y-auto min-w-0 max-w-full w-full'),
            rail
              ? orientation === 'horizontal'
                ? railGridHorizontal
                : railGridVertical
              : orientation === 'horizontal'
                ? 'grid-rows-1 px-(--stack-gap)'
                : 'grid-cols-1 py-(--stack-gap)',
            classNames,
          )}
          style={{
            [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
              size === 'split'
                ? `repeat(${itemsCount}, 1fr)`
                : `repeat(${itemsCount}, min-content) [tabster-dummies] 0`,
            ...style,
          }}
          aria-orientation={orientation}
          data-dx-stack={stackId}
          data-dx-stack-circular-focus={circularFocus}
          data-dx-last-focused-item={lastFocusedItem}
          data-rail={rail}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={composedItemRef}
        >
          {children}
          {selfDroppable && dropping && (
            <ListItem.DropIndicator
              lineInset={8}
              terminalInset={-8}
              gap={-8}
              edge={orientation === 'horizontal' ? 'left' : 'top'}
            />
          )}
        </div>
      </StackContext.Provider>
    );
  },
);
