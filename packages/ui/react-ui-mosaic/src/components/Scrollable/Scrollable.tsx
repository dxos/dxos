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

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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

export type ScrollableProps = ThemedClassName<OverlayScrollbarsComponentProps> & {
  axis?: Axis;
  padding?: boolean;
  onScroll?: (event: Event) => void;
  viewportRef?: RefObject<HTMLElement | null>;
};

/**
 * https://www.npmjs.com/package/overlayscrollbars-react
 */
export const Scrollable = forwardRef<OverlayScrollbarsComponentRef, ScrollableProps>(
  (
    { classNames, axis = 'vertical', padding, options: optionsProp = defaultOptions, onScroll, viewportRef, ...props },
    forwardedRef,
  ) => {
    const osRef = useRef<OverlayScrollbarsComponentRef>(null);
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

    // Forward the OverlayScrollbarsComponentRef to the forwardedRef.
    useEffect(() => {
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(osRef.current);
        } else {
          forwardedRef.current = osRef.current;
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

    return (
      <OverlayScrollbarsComponent
        {...props}
        className={mx(padding && (axis === 'vertical' ? 'pli-3' : 'pbe-3'), classNames)}
        options={options}
        events={events}
        ref={osRef}
      />
    );
  },
);
