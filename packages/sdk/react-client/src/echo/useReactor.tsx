//
// Copyright 2022 DXOS.org
//

import {
  FC,
  ReactElement,
  createContext,
  useContext,
  useEffect,
  useReducer,
  ForwardRefRenderFunction,
  forwardRef,
  ForwardedRef,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
  useMemo,
  useRef,
  useCallback
} from 'react';

import { useClient } from '../client';

export type UseReactor = {
  render: (component: ReactElement<any, any> | null) => ReactElement<any, any> | null;
};

export type ReactorProps = {
  onChange?: () => void;
};

export type ObserverState = {
  mounted: boolean;
  updateBeforeMount: boolean;
};

/**
 * Hook to update components that access the database when modified.
 */
export const useReactor = (opts?: ReactorProps): UseReactor => {
  const client = useClient();
  const observer = client.echo.dbRouter.createAccessObserver();
  const [, forceUpdate] = useReducer((tick) => tick + 1, 0);

  // Inspired by https://github.com/mobxjs/mobx/blob/4ef8ff3/packages/mobx-react-lite/src/useObserver.ts.
  const stateRef = useRef<ObserverState | null>(null);

  if (!stateRef.current) {
    // First render.
    stateRef.current = {
      mounted: false,
      updateBeforeMount: false
    };
  }

  const state = stateRef.current!;

  const handleUpdate = useCallback(() => {
    forceUpdate();
    opts?.onChange?.(); // TODO(burdon): Pass in modified objects.
  }, [forceUpdate, opts?.onChange]);

  // Create subscription.
  const handle = useMemo(
    () =>
      client.echo.dbRouter.createSubscription(() => {
        if (state.mounted) {
          handleUpdate();
        } else {
          state.updateBeforeMount = true;
        }
      }),
    [client, handleUpdate]
  );

  // Cancel subscription on exit.
  useEffect(() => {
    state.mounted = true;

    if (state.updateBeforeMount) {
      state.updateBeforeMount = false;
      handleUpdate();
      return;
    }

    if (!handle.subscribed) {
      console.error('bug: subscription lost'); // TODO(dmaretskyi): Fix this.
    }

    return () => {
      state.mounted = false;
      state.updateBeforeMount = false;
      handle.unsubscribe();
    };
  }, []);

  return {
    // Watch accessed objects.
    render: (component: ReactElement<any, any> | null) => {
      try {
        return component;
      } finally {
        // Trigger to update components if modified.
        handle.update([...observer.accessed]);
      }
    }
  };
};

const ReactorContext = createContext({});

export type WithReactorOpts = {
  componentName?: string;
};

/**
 * Reactive HOC.
 */
export const withReactor = <P,>(component: FC<P>, opts: WithReactorOpts = {}): FC<P> => {
  const Component = (props: P) => {
    const onChange = useCallback(() => {
      console.log('UPDATED');
    }, []);

    const { render } = useReactor({ onChange });

    return render(component(props));
  };

  if (opts.componentName) {
    Component.displayName = opts.componentName;
  }

  return Component;
};

/**
 * Reactive HOC which forwards refs.
 */
export const withReactorRef = <T, P>(
  component: ForwardRefRenderFunction<T, P>,
  opts: WithReactorOpts = {}
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>> => {
  const Component = forwardRef((props: P, ref: ForwardedRef<T>) => {
    const { render } = useReactor({
      onChange: () => {
        // console.log('UPDATED');
      }
    });

    return render(component(props, ref));
  });

  if (opts.componentName) {
    Component.displayName = opts.componentName;
  }

  return Component;
};

// TODO(burdon): Allow caller to subscribe to changes?
export const useReactorContext = (opts?: ReactorProps) => {
  useContext(ReactorContext);
  useEffect(() => {}, [opts]);
};
