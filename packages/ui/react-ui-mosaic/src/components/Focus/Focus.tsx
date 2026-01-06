//
// Copyright 2026 DXOS.org
//

import {
  type UseArrowNavigationGroupOptions,
  useArrowNavigationGroup,
  useFocusableGroup,
  useMergedTabsterAttributes_unstable,
} from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { type PropsWithChildren, createContext, forwardRef, useContext, useRef, useState } from 'react';
import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { styles } from './styles';

// TODO(burdon): Blocks: Stack, List, Toolbar, Menu.

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
  PropsWithChildren<
    {
      asChild?: boolean;
    } & Pick<UseArrowNavigationGroupOptions, 'axis'>
  >
>;

const Group = forwardRef<HTMLDivElement, GroupProps>(
  ({ classNames, children, asChild, axis = 'vertical' }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis, memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);

    const [state, setState] = useState<FocusState | undefined>();

    return (
      <FocusContext.Provider value={{ setFocus: setState }}>
        <Root
          role='none'
          tabIndex={0}
          className={mx(styles.container.root, classNames)}
          {...tabsterAttrs}
          {...(state && {
            [`data-${FOCUS_STATE_ATTR}`]: state,
          })}
          ref={composedRef}
        >
          {children}
        </Root>
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
