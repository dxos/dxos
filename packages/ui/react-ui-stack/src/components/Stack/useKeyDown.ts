//
// Copyright 2025 DXOS.org
//

import { type KeyboardEvent, useCallback } from 'react';

import { type Orientation } from '../types';
import { type StackProps } from './Stack';

const PERPENDICULAR_FOCUS_THRESHHOLD = 128;

const scrollIntoViewAndFocus = (el: HTMLElement, orientation: StackProps['orientation']) => {
  el.scrollIntoView({
    behavior: 'instant',
    [orientation === 'vertical' ? 'block' : 'inline']: 'center',
  });
  return el.focus();
};

/**
 * Handles moving focus using the arrow keys. Focus is only handled by the nearest stack.
 * If the arrow key matches the orientation, focus cycles between items, otherwise focus is passed to an adjacent stack item;
 * Or if there is no such stack item, focus is passed to the adjacent empty stack if one can be found.
 * @deprecated
 */
// TODO(burdon): Replace with Mosaic.Stack which handles this automatically.
export const useKeyDown = (stackId: string, circularFocus?: boolean, onKeyDown?: StackProps['onKeyDown']) =>
  useCallback(
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
        const closestStackItems = Array.from(closestStack?.querySelectorAll(`[data-dx-stack-item="${stackId}"]`) ?? []);
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
            const currentIndex = closestStackItems.indexOf(closestOwnedItem);
            const nextIndex = currentIndex + parallelDelta;
            let adjacentItem: HTMLElement | undefined;
            if (circularFocus) {
              // Circular navigation: wrap around using modulo.
              adjacentItem = closestStackItems[(nextIndex + closestStackItems.length) % closestStackItems.length] as
                | HTMLElement
                | undefined;
            } else {
              // Non-circular navigation: only move if within bounds.
              if (nextIndex >= 0 && nextIndex < closestStackItems.length) {
                adjacentItem = closestStackItems[nextIndex] as HTMLElement | undefined;
              }
            }

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
              const currentStackIndex = siblingStacks.indexOf(closestStack);
              const nextStackIndex = currentStackIndex + perpendicularDelta;
              let adjacentStack: HTMLElement | undefined;

              if (ancestorStack.getAttribute('data-dx-stack-circular-focus') === 'true') {
                // Circular navigation: wrap around using modulo.
                adjacentStack = siblingStacks[(nextStackIndex + siblingStacks.length) % siblingStacks.length] as
                  | HTMLElement
                  | undefined;
              } else {
                // Non-circular navigation: only move if within bounds.
                if (nextStackIndex >= 0 && nextStackIndex < siblingStacks.length) {
                  adjacentStack = siblingStacks[nextStackIndex] as HTMLElement | undefined;
                }
              }
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
              if (adjacentStack && adjacentStackItems.length > 0) {
                // Check if the adjacent stack has a last focused item recorded, otherwise find the closest item by position.
                let closestItem = adjacentStackItems[0];
                // Try to find an item with matching data-dx-stack-item value.
                const lastFocusedItem = adjacentStack.querySelector(
                  `[data-dx-item-id="${adjacentStack.getAttribute('data-dx-last-focused-item') ?? 'never'}"]`,
                );
                if (lastFocusedItem) {
                  closestItem = lastFocusedItem as HTMLElement;
                } else {
                  // Fall back to positional calculation
                  const ownedItemRect = closestOwnedItem.getBoundingClientRect();
                  const targetPosition =
                    closestStackOrientation === 'vertical' ? ownedItemRect.top : ownedItemRect.left;

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
      onKeyDown?.(event);
    },
    [onKeyDown, stackId, circularFocus],
  );
