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

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// These are not exported from the pragmatic-drag-and-drop-auto-scroll package.
export type Axis = 'vertical' | 'horizontal';
export type AllowedAxis = Axis | 'all';

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
  axis?: Axis;
  snap?: boolean;
  padding?: boolean;
  onScroll?: (event: Event) => void;
  viewportRef?: RefCallback<HTMLElement | null>;
};

/**
 * https://www.npmjs.com/package/overlayscrollbars-react
 */
export const Scrollable = forwardRef<HTMLDivElement, ScrollableProps>(
  (
    {
      classNames,
      axis = 'vertical',
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
      if (axis) {
        options.overflow = {
          x: axis === 'horizontal' ? 'scroll' : 'hidden',
          y: axis === 'vertical' ? 'scroll' : 'hidden',
        };
      }

      return options;
    }, [axis, optionsProp]);

    useImperativeHandle(forwardedRef, () => osRef.current?.getElement() as HTMLDivElement, [osRef]);

    useEffect(() => {
      const instance = osRef.current?.osInstance();
      const viewport = instance?.elements().viewport;
      if (viewportRef) {
        viewportRef(viewport ?? null);
      }

      if (viewport && snap) {
        viewport.className = mx(viewport.className, 'snap-mandatory', axis === 'vertical' ? 'snap-y' : 'snap-x');
      }
    }, [viewportRef, axis, snap]);

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
        className={mx(padding && (axis === 'vertical' ? 'pli-3' : 'pbe-3'), classNames)}
        options={options}
        events={events}
        ref={osRef}
      />
    );
  },
);
