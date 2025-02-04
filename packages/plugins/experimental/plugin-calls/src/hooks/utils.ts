//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject, type Observable } from 'rxjs';

/**
 * Useful utility for getting a stable reference to a POJO that might be created on every new render.
 */
export const useStablePojo = <T>(value: T): T => {
  const jsonString = JSON.stringify(value);
  return useMemo(() => JSON.parse(jsonString), [jsonString]);
};

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
  const ref = useRef<BehaviorSubject<T> | undefined>(new BehaviorSubject<T>(value));
  const observableRef = useRef<Observable<T>>(ref.current!.asObservable());
  const previousValue = useRef<T>();

  if (previousValue.current !== value) {
    previousValue.current = value;
    ref.current!.next(value);
  }

  useEffect(() => {
    if (ref.current === undefined) {
      ref.current = new BehaviorSubject(value);
      observableRef.current = ref.current!.asObservable();
    }

    return () => {
      ref.current?.complete();
      ref.current = undefined;
    };
  }, []);

  return observableRef.current;
};
