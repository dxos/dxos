//
// Copyright 2022 DXOS.org
//

import { useEffect, useRef } from 'react';

/**
 * Provides a function to test if the component is still mounted.
 * Avoids the following error:
 * "Warning: Can't perform a React state update on an unmounted component."
 *
 * ```tsx
 * const Test = () => {
 *   const isMounted = useMounted();
 *   const [value, setValue] = useState('');
 *   useEffect(() => {
 *     setTimeout(() => {
 *       if (isMounted()) {
 *         setValue(value);
 *       }
 *     }, 1000);
 *   }, []);
 *
 *   return (
 *     <div>{value}</div>
 *   );
 * }
 * ```
 */
export const useMounted = () => {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return () => mounted.current;
};
