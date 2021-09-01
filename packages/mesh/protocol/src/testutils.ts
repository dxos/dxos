//
// Copyright 2021 DXOS.org
//

import pump from 'pump';

import { createPromiseFromCallback } from '@dxos/async';

import { Protocol } from './protocol';

/**
 * Connect two protocols in-memory.
 *
 * If protocol is closed because of an error, this error will be propagated through the returned promise.
 */
export function pipeProtocols (a: Protocol, b: Protocol) {
  return createPromiseFromCallback(cb => pump(a.stream as any, b.stream as any, a.stream as any, cb));
}
