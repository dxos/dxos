//
// Copyright 2025 DXOS.org
//

import { composeRefs } from '@radix-ui/react-compose-refs';
import React, {
  type CSSProperties,
  Children,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ListItem, type ThemedClassName, useId } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStackDropForElements } from '../../hooks';
import { type StackContextValue } from '../defs';
import { StackContext } from '../StackContext';

export type Orientation = 'horizontal' | 'vertical';
/**
 * Size is how Stack and its StackItems coordinate the dimensions of the items with the available space.
 * - `intrinsic` signals to Stack and its StackItems to occupy their intrinsic size
 * - Any other size will extrinsically fill the available space along the axis of its orientation and handle overflow:
 *   - `contain` causes StackItems to occupy their intrinsic size
 *   - `split` divides the Stack’s available space among the StackItems
 */
export type Size = 'intrinsic' | 'contain' | 'split';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithRef<'div'>>, 'aria-orientation'> &
  Partial<StackContextValue> & {
    itemsCount?: number;
    getDropElement?: (stackElement: HTMLDivElement) => HTMLDivElement;
    separatorOnScroll?: number;
  };

export const railGridHorizontal = 'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';
export const railGridVertical = 'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

// TODO(ZaymonFC): Magic 2px to stop overflow.
export const railGridHorizontalContainFitContent =
  'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_fit-content(calc(100%-var(--rail-size)*2+2px))_[content-end]]';
export const railGridVerticalContainFitContent =
  'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_fit-content(calc(100%-var(--rail-size)*2+2px))_[content-end]]';

export const autoScrollRootAttributes = { 'data-drag-autoscroll': 'idle' };

const PERPENDICULAR_FOCUS_THRESHHOLD = 128;

const scrollIntoViewAndFocus = (el: HTMLElement, orientation: StackProps['orientation']) => {
  el.scrollIntoView({
    behavior: 'instant',
    [orientation === 'vertical' ? 'block' : 'inline']: 'center',
  });
  return el.focus();
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      classNames,
      style,
      orientation = 'vertical',
      rail = true,
      size = 'intrinsic',
      onRearrange,
      itemsCount = Children.count(children),
      getDropElement,
      separatorOnScroll,
      ...props
    },
    forwardedRef,
  ) => {
    const stackId = useId('stack', props.id);
    const [stackElement, stackRef] = useState<HTMLDivElement | null>(null);
    const composedItemRef = composeRefs<HTMLDivElement>(stackRef, forwardedRef);

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
        size === 'split' ? `repeat(${itemsCount}, 1fr)` : `repeat(${itemsCount}, min-content) [tabster-dummies] 0`,
      ...style,
    };

    const selfDroppable = !!(itemsCount < 1 && onRearrange && props.id);

    const { dropping } = useStackDropForElements({
      id: props.id,
      element: getDropElement && stackElement ? getDropElement(stackElement) : stackElement,
      scrollElement: stackElement,
      selfDroppable,
      orientation,
      onRearrange,
    });

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

    /**
     * Handles moving focus using the arrow keys. Focus is only handled by the nearest stack; if the arrow key matches the
     * orientation, focus cycles between items, otherwise focus is passed to an adjacent stack item; or, if there is no
     * such stack item, focus is passed to the adjacent empty stack if one can be found.
     */
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (
          event.key.startsWith('Arrow') &&
          !target.closest(
            `input, textarea, [role="textbox"], [data-tabster*="mover"], [data-arrow-keys="all"], [data-arrow-keys~="${event.key.toLowerCase().slice(5)}"]`,
          )
        ) {
          const closestOwnedItem = target.closest(`[data-dx-stack-item="${stackId}"]`);
          const closestStack = target.closest('[data-dx-stack]') as HTMLElement | null;
          const closestStackItems = Array.from(
            closestStack?.querySelectorAll(`[data-dx-stack-item="${stackId}"]`) ?? [],
          );
          const closestStackOrientation = closestStack?.getAttribute('aria-orientation') as Orientation;
          const ancestorStack = closestStack?.parentElement?.closest('[data-dx-stack]') as HTMLElement | null;
          if (closestOwnedItem && closestStack) {
            const ancestorOrientation = ancestorStack?.getAttribute('aria-orientation') as Orientation | undefined;
            const parallelDelta = (
              closestStackOrientation === 'vertical' ? event.key === 'ArrowUp' : event.key === 'ArrowLeft'
            )
              ? -1
              : (closestStackOrientation === 'vertical' ? event.key === 'ArrowDown' : event.key === 'ArrowRight')
                ? 1
                : 0;
            const perpendicularDelta = (
              closestStackOrientation === 'vertical' ? event.key === 'ArrowLeft' : event.key === 'ArrowUp'
            )
              ? -1
              : (closestStackOrientation === 'vertical' ? event.key === 'ArrowRight' : event.key === 'ArrowDown')
                ? 1
                : 0;
            if (parallelDelta !== 0) {
              const adjacentItem = closestStackItems[
                (closestStackItems.indexOf(closestOwnedItem) + parallelDelta + closestStackItems.length) %
                  closestStackItems.length
              ] as HTMLElement | undefined;
              if (adjacentItem) {
                event.preventDefault();
                scrollIntoViewAndFocus(adjacentItem, closestStackOrientation);
              }
            }
            if (perpendicularDelta !== 0) {
              if (ancestorStack && ancestorOrientation !== closestStackOrientation) {
                const siblingStacks = Array.from(
                  ancestorStack.querySelectorAll(
                    `[data-dx-stack-item="${ancestorStack.getAttribute('data-dx-stack')}"] [data-dx-stack]`,
                  ),
                ) as HTMLElement[];
                const adjacentStack = siblingStacks[
                  (siblingStacks.indexOf(closestStack) + perpendicularDelta + siblingStacks.length) %
                    siblingStacks.length
                ] as HTMLElement | undefined;
                const adjacentStackSelfItem = adjacentStack?.closest(
                  `[data-dx-stack-item=${ancestorStack.getAttribute('data-dx-stack')}]`,
                ) as HTMLElement | undefined;
                const adjacentStackItems = adjacentStack
                  ? (Array.from(
                      adjacentStack.querySelectorAll(
                        `[data-dx-stack-item="${adjacentStack.getAttribute('data-dx-stack')}"]`,
                      ),
                    ) as HTMLElement[])
                  : [];
                if (adjacentStackItems.length > 0) {
                  // Find the closest item by position
                  const ownedItemRect = closestOwnedItem.getBoundingClientRect();
                  const targetPosition =
                    closestStackOrientation === 'vertical' ? ownedItemRect.top : ownedItemRect.left;

                  let closestItem = adjacentStackItems[0];
                  let closestDistance = Infinity;

                  for (const item of adjacentStackItems) {
                    const itemRect = item.getBoundingClientRect();
                    const itemPosition = closestStackOrientation === 'vertical' ? itemRect.top : itemRect.left;
                    const distance = Math.abs(itemPosition - targetPosition);

                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestItem = item;
                    }
                    if (closestDistance <= PERPENDICULAR_FOCUS_THRESHHOLD) {
                      break;
                    }
                  }

                  event.preventDefault();
                  scrollIntoViewAndFocus(closestItem, closestStackOrientation);
                } else if (adjacentStackSelfItem) {
                  event.preventDefault();
                  scrollIntoViewAndFocus(adjacentStackSelfItem, ancestorOrientation);
                }
              } else if (closestOwnedItem) {
                const closestOwnedItemStack = closestOwnedItem.querySelector('[data-dx-stack]');
                const closestOwnedItemStackItems = closestOwnedItemStack
                  ? (Array.from(
                      closestOwnedItemStack.querySelectorAll(
                        `[data-dx-stack-item="${closestOwnedItemStack.getAttribute('data-dx-stack')}"]`,
                      ),
                    ) as HTMLElement[])
                  : [];
                if (closestOwnedItemStackItems.length > 0) {
                  event.preventDefault();
                  scrollIntoViewAndFocus(
                    closestOwnedItemStackItems[
                      ['ArrowUp', 'ArrowLeft'].includes(event.key) ? closestOwnedItemStackItems.length - 1 : 0
                    ],
                    closestOwnedItemStack?.getAttribute('aria-orientation') as Orientation,
                  );
                }
              }
            }
          }
        }
        props.onKeyDown?.(event);
      },
      [props.onKeyDown, stackId],
    );

    const gridClasses = useMemo(() => {
      if (!rail) {
        return orientation === 'horizontal' ? 'grid-rows-1 pli-[--stack-gap]' : 'grid-cols-1 plb-[--stack-gap]';
      }
      if (orientation === 'horizontal') {
        return railGridHorizontal;
      } else {
        return railGridVertical;
      }
    }, [rail, orientation, size]);

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
      <StackContext.Provider value={{ orientation, rail, size, onRearrange, stackId }}>
        <div
          {...props}
          className={mx(
            'grid relative [--stack-gap:var(--dx-trimXs)]',
            gridClasses,
            size === 'contain' &&
              (orientation === 'horizontal'
                ? 'overflow-x-auto overscroll-x-contain min-bs-0 max-bs-full bs-full'
                : 'overflow-y-auto min-is-0 max-is-full is-full'),
            classNames,
          )}
          onKeyDown={handleKeyDown}
          data-dx-stack={stackId}
          data-rail={rail}
          aria-orientation={orientation}
          style={styles}
          ref={composedItemRef}
          {...(Number.isFinite(separatorOnScroll) && { onScroll: handleScroll })}
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

export { StackContext };

export type { StackContextValue };
