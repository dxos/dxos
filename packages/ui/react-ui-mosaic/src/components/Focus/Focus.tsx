//
// Copyright 2026 DXOS.org
//

import {
  useArrowNavigationGroup,
  useFocusableGroup,
  useMergedTabsterAttributes_unstable,
} from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type FocusEvent,
  type KeyboardEvent,
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { type Axis } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

//
// Context
//

type FocusState = 'active' | 'error';

const FOCUS_STATE_ATTR = 'focus-state';

type ContextValue = {
  setFocus?: (state: FocusState | undefined) => void;
};

const FocusContext = createContext<ContextValue>({});

const useFocus = () => useContext(FocusContext);

//
// Group
//

type GroupProps = PropsWithChildren<{
  asChild?: boolean;
  orientation?: Axis;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}>;

// TODO(wittjosiah): Consider how this could integrate with with react-ui-attention.
//   Perhaps react-ui-attention comes under the mosaic umbrella as it supports selection?
const Group = composable<HTMLDivElement, GroupProps>(
  ({ children, asChild, orientation = 'vertical', ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: orientation, memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);
    const [state, setState] = useState<FocusState | undefined>();
    const currentRef = useRef<HTMLElement | null>(null);

    // Track the currently focused tile via event delegation.
    const handleFocusIn = useCallback((event: FocusEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const tile = target.closest('[role="listitem"]') as HTMLElement | null;
      if (tile === currentRef.current) {
        return;
      }
      if (currentRef.current) {
        currentRef.current.removeAttribute('aria-current');
      }
      if (tile && rootRef.current?.contains(tile)) {
        tile.setAttribute('aria-current', 'true');
        currentRef.current = tile;
      }
    }, []);

    const handleFocusOut = useCallback((event: FocusEvent<HTMLDivElement>) => {
      // Clear aria-current when focus leaves the group entirely.
      const related = event.relatedTarget as HTMLElement | null;
      if (!related || !rootRef.current?.contains(related)) {
        if (currentRef.current) {
          currentRef.current.removeAttribute('aria-current');
          currentRef.current = null;
        }
      }
    }, []);

    return (
      <FocusContext.Provider value={{ setFocus: setState }}>
        <Comp
          {...composableProps(props, {
            tabIndex: 0,
            className: mx([
              // TODO(burdon): Option for border/rounded; ring/outline vs border?
              'outline-hidden border border-separator rounded-xs',
              // Focus (e.g., via tabster).
              'focus:border-neutral-focus-indicator',
              // Active (e.g., drop target).
              'data-[focus-state=active]:border-neutral-focus-indicator',
              // Error
              'data-[focus-state=error]:border-rose-500',
            ]),
          })}
          {...tabsterAttrs}
          {...(state && { [`data-${FOCUS_STATE_ATTR}`]: state })}
          onFocus={handleFocusIn}
          onBlur={handleFocusOut}
          ref={composedRef}
        >
          {children}
        </Comp>
      </FocusContext.Provider>
    );
  },
);

//
// Focus
//

export const Focus = {
  Group,
};

export type { GroupProps as FocusGroupProps };

export { useFocus };
