//
// Copyright 2026 DXOS.org
//

import { type EventListeners } from 'overlayscrollbars';
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react';
import React, { type RefCallback, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type Axis, type ThemedClassName } from '@dxos/ui-types';

import 'overlayscrollbars/styles/overlayscrollbars.css';

// TODO(burdon): Move to theme.
import './scrollable.css';

const defaultOptions: ScrollableProps['options'] = {
  scrollbars: {
    autoHide: 'leave',
    autoHideDelay: 1_000,
    autoHideSuspend: true,
  },
};

export type ScrollableProps = ThemedClassName<Omit<OverlayScrollbarsComponentProps, 'ref'>> & {
  orientation?: Axis;
  snap?: boolean;
  padding?: boolean;
  onScroll?: (event: Event) => void;
  viewportRef?: RefCallback<HTMLElement | null>;
};

/**
 * Custom scrollable container.
 * https://www.npmjs.com/package/overlayscrollbars-react
 */
export const Scrollable = forwardRef<HTMLDivElement, ScrollableProps>(
  (
    {
      classNames,
      orientation = 'vertical',
      snap,
      padding,
      options: optionsProp = defaultOptions,
      onScroll,
      viewportRef,
      ...props
    },
    forwardedRef,
  ) => {
    const osRef = useRef<OverlayScrollbarsComponentRef>(null);
    const options = useMemo(() => {
      const options = { ...optionsProp };
      if (orientation) {
        options.overflow = {
          y: orientation === 'vertical' ? 'scroll' : 'hidden',
          x: orientation === 'horizontal' ? 'scroll' : 'hidden',
        };
      }

      return options;
    }, [orientation, optionsProp]);

    useImperativeHandle(forwardedRef, () => osRef.current?.getElement() as HTMLDivElement, [osRef]);

    useEffect(() => {
      const instance = osRef.current?.osInstance();
      const viewport = instance?.elements().viewport;
      if (viewportRef) {
        viewportRef(viewport ?? null);
      }

      if (viewport && snap) {
        viewport.className = mx(viewport.className, 'snap-mandatory', orientation === 'vertical' ? 'snap-y' : 'snap-x');
      }
    }, [viewportRef, orientation, snap]);

    const events = useMemo<EventListeners | null>(() => {
      if (!onScroll) {
        return null;
      }

      return {
        scroll: (_, event: Event) => {
          onScroll(event);
        },
      } satisfies EventListeners;
    }, [onScroll]);

    return (
      <OverlayScrollbarsComponent
        {...props}
        // TODO(burdon): Factor out padding to container.
        className={mx(padding && (orientation === 'vertical' ? 'pli-3' : 'pbe-3'), classNames)}
        options={options}
        events={events}
        ref={osRef}
      />
    );
  },
);
