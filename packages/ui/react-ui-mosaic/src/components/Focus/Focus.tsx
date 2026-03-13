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
import React, { type PropsWithChildren, createContext, forwardRef, useContext, useRef, useState } from 'react';

import { type Axis, type ThemedClassName } from '@dxos/react-ui';
import { composableProps, mx } from '@dxos/ui-theme';

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

type GroupProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    orientation?: Axis;
  }>
> & { className?: string };

// TODO(wittjosiah): Consider how this could integrate with with react-ui-attention.
//   Perhaps react-ui-attention comes under the mosaic umbrella as it supports selection?
const Group = forwardRef<HTMLDivElement, GroupProps>(
  ({ children, asChild, orientation = 'vertical', ...props }: GroupProps, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);

    // TODO(burdon): Configure.
    const focusableGroupAttrs = useFocusableGroup({
      tabBehavior: 'limited-trap-focus',
    });
    const arrowNavigationAttrs = useArrowNavigationGroup({
      axis: orientation,
      memorizeCurrent: true,
    });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);
    const [state, setState] = useState<FocusState | undefined>();

    return (
      <FocusContext.Provider value={{ setFocus: setState }}>
        <Comp
          {...rest}
          {...tabsterAttrs}
          {...(state && {
            [`data-${FOCUS_STATE_ATTR}`]: state,
          })}
          tabIndex={0}
          className={mx(
            [
              // TODO(burdon): Option for border/rounded; ring/outline vs border?
              'outline-hidden border border-separator md:rounded-xs',
              // Focus (e.g., via tabster).
              'focus:!border-accent-surface',
              // Active (e.g., drop target).
              'data-[focus-state=active]:border-neutral-focus-indicator',
              // Error
              'data-[focus-state=error]:border-rose-500',
            ],
            className,
          )}
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
