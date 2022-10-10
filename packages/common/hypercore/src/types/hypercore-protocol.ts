//
// Copyright 2021 DXOS.org
//

import { Duplex } from 'streamx';

/**
 * Hypercore Typescript Definitions version 9.12.0
 * NOTE: Must not clash with 'hypercore' package name.
 *
 * https://hypercore-protocol.org
 * https://github.com/hypercore-protocol/hypercore-protocol
 */

// TODO(burdon): Custom fork of simple-hypercore-protocol
//  dxos/hypercore-protocol#05513f9266f8bec4d29b144b72c59257c2d7bd60

export type ProtocolStreamOptions = {
  encrypted: true
}

export interface ProtocolStream extends Duplex {
  finalize (): void
}

// Default constructor.
// https://github.com/hypercore-protocol/hypercore-protocol#const-stream--new-protocolinitiator-options
export type ProtocolStreamConstructor = (initiator: boolean, options: ProtocolStreamOptions) => ProtocolStream;
