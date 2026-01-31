//
// Copyright 2026 DXOS.org
//

import { type EventListeners } from 'overlayscrollbars';
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react';
import React, { type RefObject, forwardRef, useEffect, useMemo, useRef } from 'react';

import { type Axis } from '../Mosaic';

import 'overlayscrollbars/styles/overlayscrollbars.css';
import './scrollable.css';

const defaultOptions: ScrollableProps['options'] = {
  scrollbars: {
    autoHide: 'leave',
    autoHideDelay: 1_000,
    autoHideSuspend: true,
  },
};

// TODO(burdon): row/column: options={{ overflow: { x: 'scroll' } }}
export type ScrollableProps = OverlayScrollbarsComponentProps & {
  axis?: Axis;
  onScroll?: (event: Event) => void;
  viewportRef?: RefObject<HTMLElement | null>;
};

/**
 * https://www.npmjs.com/package/overlayscrollbars-react
 */
export const Scrollable = forwardRef<HTMLDivElement, ScrollableProps>(
  ({ axis, options: optionsProp = defaultOptions, onScroll, viewportRef, ...props }, forwardedRef) => {
    const osRef = useRef<OverlayScrollbarsComponentRef<'div'>>(null);
    const options = useMemo(() => {
      const options = { ...optionsProp };
      if (axis) {
        options.overflow = {
          x: axis === 'horizontal' ? 'scroll' : 'hidden',
          y: axis === 'vertical' ? 'scroll' : 'hidden',
        };
      }
      return options;
    }, [axis, optionsProp]);

    // Forward the host element to the forwardedRef for asChild/Slot compatibility.
    useEffect(() => {
      const hostElement = osRef.current?.getElement();
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(hostElement ?? null);
        } else {
          forwardedRef.current = hostElement ?? null;
        }
      }
    });

    useEffect(() => {
      const instance = osRef.current?.osInstance();
      if (viewportRef) {
        viewportRef.current = instance?.elements().viewport ?? null;
      }
    }, [osRef, viewportRef]);

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

    return <OverlayScrollbarsComponent options={options} {...props} events={events} ref={osRef} />;
  },
);
