//
// Copyright 2025 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, {
  type CSSProperties,
  Children,
  type ComponentPropsWithRef,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ListItem, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStackDropForElements } from '../../hooks';
import { type StackContextValue } from '../defs';
import { StackContext } from '../StackContext';

export type Orientation = 'horizontal' | 'vertical';
export type Size = 'intrinsic' | 'contain' | 'contain-fit-content' | 'split';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithRef<'div'>>, 'aria-orientation'> &
  Partial<StackContextValue> & {
    itemsCount?: number;
    getDropElement?: (stackElement: HTMLDivElement) => HTMLDivElement;
    separatorOnScroll?: number;
  };

export const railGridHorizontal = 'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';
export const railGridVertical = 'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_1fr_[content-end]]';

// TODO(ZaymonFC): Magic 2px to stop overflow (tabster dummies... ask @thure).
export const railGridHorizontalContainFitContent =
  'grid-rows-[[rail-start]_var(--rail-size)_[content-start]_fit-content(calc(100%-var(--rail-size)*2+2px))_[content-end]]';
export const railGridVerticalContainFitContent =
  'grid-cols-[[rail-start]_var(--rail-size)_[content-start]_fit-content(calc(100%-var(--rail-size)*2+2px))_[content-end]]';

export const autoScrollRootAttributes = { 'data-drag-autoscroll': 'idle' };

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
    const [stackElement, stackRef] = useState<HTMLDivElement | null>(null);
    const composedItemRef = composeRefs<HTMLDivElement>(stackRef, forwardedRef);
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: orientation });

    const styles: CSSProperties = {
      [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
        `repeat(${itemsCount}, ${size === 'split' ? `${(100 / itemsCount).toFixed(2)}%` : 'min-content'}) [tabster-dummies] 0`,
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

    const gridClasses = useMemo(() => {
      if (!rail) {
        return orientation === 'horizontal' ? 'grid-rows-1 pli-1' : 'grid-cols-1 plb-1';
      }
      if (orientation === 'horizontal') {
        return size === 'contain-fit-content' ? railGridHorizontalContainFitContent : railGridHorizontal;
      } else {
        return size === 'contain-fit-content' ? railGridVerticalContainFitContent : railGridVertical;
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
      <StackContext.Provider value={{ orientation, rail, size, onRearrange }}>
        <div
          {...props}
          {...arrowNavigationAttrs}
          className={mx(
            'grid relative',
            gridClasses,
            (size === 'contain' || size === 'contain-fit-content') &&
              (orientation === 'horizontal'
                ? 'overflow-x-auto overscroll-x-contain min-bs-0 max-bs-full bs-full'
                : 'overflow-y-auto min-is-0 max-is-full is-full'),
            classNames,
          )}
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
