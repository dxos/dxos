import { createPromiseFromCallback } from '@dxos/async';
import pump from 'pump';
import { Protocol } from "./protocol";

/**
 * Connect two protocols in-memory.
 * 
 * The returned promise will most likely reject after protocols were closed, so its best to ignore the error.
 */
export function pipeProtocols(a: Protocol, b: Protocol) {
  return createPromiseFromCallback(cb => pump(a.stream as any, b.stream as any, a.stream as any, cb))
}
