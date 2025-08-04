//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';

import { log } from '@dxos/log';

/**
 * Use to debug which props have changed to trigger re-renders in a React component.
 */
export const useTrackProps = <T extends Record<string, unknown>>(
  props: T,
  componentName = 'Component',
  active = true,
) => {
  const prevProps = useRef<T>(props);
  useEffect(() => {
    const changes = Object.entries(props).filter(([key]) => props[key] !== prevProps.current[key]);
    if (changes.length > 0) {
      if (active) {
        log.info('props changed', {
          componentName,
          keys: changes.map(([key]) => key).join(','),
          props: Object.fromEntries(
            changes.map(([key]) => [
              key,
              {
                from: prevProps.current[key],
                to: props[key],
              },
            ]),
          ),
        });
      }
    }

    prevProps.current = props;
  });
};
