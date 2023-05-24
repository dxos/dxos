//
// Copyright 2022 DXOS.org
//

import { FunctionComponent, useEffect, useRef, useState } from 'react';

import { SubscriptionHandle, createAccessObserver, createSubscription } from '../access-observer';

type ObserverState = {
  handle: SubscriptionHandle | null;
  timeout: NodeJS.Timeout | null;
  mounted: boolean;
  updateBeforeMount: boolean;
};

// TODO(wittjosiah): Many comments below are copied from Mobx, make them more DXOS-specific.

// const hasSymbol = typeof Symbol === 'function' && Symbol.for;
// Using react-is had some issues (and operates on elements, not on types).
// https://github.com/mobxjs/mobx/blob/bd4b70d/packages/mobx-react-lite/src/observer.ts#L9
// const ReactForwardRefSymbol = hasSymbol
//   ? Symbol.for('react.forward_ref')
//   : typeof forwardRef === 'function' && forwardRef((props: any) => null).$$typeof;

/**
 * HOC to provide reactivity based on changes to ECHO state.
 */
// export const observer = <P extends object, TRef = {}>(
//   baseComponent: FunctionComponent<P> | ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>
// ): ((props: P, ref: Ref<TRef>) => ReactElement<P, any> | null) => {
export const observer = <P,>(baseComponent: FunctionComponent<P>): FunctionComponent<P> => {
  const baseComponentName = baseComponent.displayName || baseComponent.name;
  // let useForwardRef = false;
  // let render = baseComponent;

  // If already wrapped with forwardRef, unwrap, so we can patch render.
  // if (ReactForwardRefSymbol && '$$typeof' in baseComponent && baseComponent.$$typeof === ReactForwardRefSymbol) {
  //   useForwardRef = true;
  //   render = (baseComponent as any).render;
  //   if (typeof render !== 'function') {
  //     throw new Error('`render` property of ForwardRef was not a function');
  //   }
  // }

  // const observerComponent = (props: any, ref: React.Ref<TRef>) => {
  const observerComponent = (props: any) => {
    const accessObserver = createAccessObserver();
    const [, setState] = useState([]);
    const forceUpdate = () => setState([]);

    // Inspired by https://github.com/mobxjs/mobx/blob/4ef8ff3/packages/mobx-react-lite/src/useObserver.ts.
    const stateRef = useRef<ObserverState | null>(null);
    if (!stateRef.current) {
      // First render.
      stateRef.current = {
        handle: null,
        timeout: null,
        mounted: false,
        updateBeforeMount: false,
      };
    }

    const state = stateRef.current!;
    if (!state.handle) {
      // First render or component was not committed.
      state.handle = createSubscription(() => {
        // Observable has changed, meaning we want to re-render
        // BUT if we're a component that hasn't yet got to the useEffect()
        // stage, we might be a component that _started_ to render, but
        // got dropped, and we don't want to make state changes then.
        // (It triggers warnings in StrictMode, for a start.)
        if (state.mounted) {
          // We have reached useEffect(), so we're mounted, and can trigger an update.
          forceUpdate();
        } else {
          // We haven't yet reached useEffect(), so we'll need to trigger a re-render
          // when (and if) useEffect() arrives.
          state.updateBeforeMount = true;
        }
      });

      state.timeout = setTimeout(() => {
        state.handle?.unsubscribe();
      }, 10_000);
    }

    // Cancel subscription on exit.
    useEffect(() => {
      state.mounted = true;
      if (state.timeout) {
        clearTimeout(state.timeout);
        state.timeout = null;
      }

      if (state.handle) {
        if (state.updateBeforeMount) {
          // Got a change before mount, force an update.
          state.updateBeforeMount = false;
          forceUpdate();
        }
      } else {
        // The reaction we set up in our render has been disposed.
        // This can be due to bad timings of renderings, e.g. our component was paused for a _very_ long time,
        // and our reaction got cleaned up.

        // Re-create the reaction.
        state.handle = createSubscription(() => {
          // We've definitely already been mounted at this point.
          forceUpdate();
        });
        forceUpdate(); // TODO(burdon): Trigger by default.
      }

      if (!state.handle!.subscribed) {
        console.error('bug: subscription lost'); // TODO(dmaretskyi): Fix this.
      }

      return () => {
        state.handle!.unsubscribe();
        state.handle = null;
        state.mounted = false;
        state.updateBeforeMount = false;
      };
    }, []);

    try {
      return baseComponent(props);
    } finally {
      // Trigger to update components if modified.
      state.handle.update([...accessObserver.accessed]);
      accessObserver.pop();
    }
  };

  // Don't set `displayName` for anonymous components,
  if (baseComponentName !== '') {
    (observerComponent as FunctionComponent).displayName = baseComponentName;
  }

  // TODO(wittjosiah): Wrapping with forwardRef or memo make this not work.

  // if (useForwardRef) {
  // `forwardRef` must be applied prior `memo`
  // `forwardRef(observer(cmp))` throws:
  // "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))"
  // observerComponent = forwardRef(observerComponent);
  // }

  // memo; we are not interested in deep updates
  // in props; we assume that if deep objects are changed,
  // this is in observables, which would have been tracked anyway
  // observerComponent = memo(observerComponent);

  return observerComponent;
};
