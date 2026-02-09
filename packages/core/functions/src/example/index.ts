//
// Copyright 2025 DXOS.org
//

import { default as fib$ } from './fib';
import { default as reply$ } from './reply';
import { default as sleep$ } from './sleep';

export namespace Example {
  export const fib = fib$;
  export const reply = reply$;
  export const sleep = sleep$;
}
