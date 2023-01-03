//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactElement, useEffect, useReducer, useState } from 'react';

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
export const useReactor = (props?: ReactorProps): UseRector => {
  const client = useClient();
  const accessObserver = client.echo.dbRouter.createAccessObserver();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Create subscription.
  const [handle] = useState(() =>
    client.echo.dbRouter.createSubscription(() => {
      forceUpdate();
      props?.onChange?.(); // TODO(burdon): Pass in modified objects.
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
        handle.update([...accessObserver.accessed]);
      }
    }
  };
};

/**
 * Reactive HOC.
 */
export const withReactor = <P>(component: FC<P>): React.FC<P> => {
  return (props) => {
    const { render } = useReactor();
    return render(component(props));
  };
};
