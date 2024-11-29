//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef, useState } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

export const useSubscribedState = <T>(observable: Observable<T>, defaultValue?: T): T => {
  const [state, setState] = useState(defaultValue);
  useObservableEffect(observable, setState);
  return state as any;
};

export const useObservableEffect = <T>(observable: Observable<T>, fn: (value: T) => void) => {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    const subscription = observable.subscribe((v) => {
      fnRef.current(v);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [observable]);
};

/**
 * Turns a value into a stable observable that will emit new
 * values when the value changes, and completes upon unmounting.
 */
export const useStateObservable = <T>(value: T) => {
  const ref = useRef(new BehaviorSubject(value));
  const observableRef = useRef(ref.current.asObservable());
  const previousValue = useRef<T>();
  if (previousValue.current !== value) {
    previousValue.current = value;
    ref.current.next(value);
  }

  useEffect(() => {
    const { current } = ref;
    if (!current) {
      return;
    }
    return () => {
      current.complete();
    };
  }, []);

  return observableRef.current;
};
