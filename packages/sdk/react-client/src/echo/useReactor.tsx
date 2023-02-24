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
  useState,
  ForwardRefRenderFunction,
  forwardRef,
  ForwardedRef,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes
} from 'react';

import { useClient } from '../client';

export type UseRector = {
  render: (component: ReactElement<any, any> | null) => ReactElement<any, any> | null;
};

export type ReactorProps = {
  onChange?: () => void;
};

/**
 * Hook to update components that access the database when modified.
 */
export const useReactor = (opts?: ReactorProps): UseRector => {
  const client = useClient();
  const observer = client.echo.dbRouter.createAccessObserver();
  const [, forceUpdate] = useReducer((tick) => tick + 1, 0);

  // Create subscription.
  const [handle] = useState(() =>
    client.echo.dbRouter.createSubscription(() => {
      forceUpdate();
      opts?.onChange?.(); // TODO(burdon): Pass in modified objects.
    })
  );

  // Cancel subscription on exit.
  useEffect(() => {
    if (!handle.subscribed) {
      console.error('bug: subscription lost'); // TODO(dmaretskyi): Fix this.
    }

    return () => handle.unsubscribe();
  }, []);

  // Watch accessed objects.
  return {
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
    const { render } = useReactor({
      onChange: () => {
        // console.log('UPDATED');
      }
    });

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
