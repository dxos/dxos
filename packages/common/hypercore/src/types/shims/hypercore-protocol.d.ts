//
// Copyright 2022 DXOS.org
//

/**
 * https://www.npmjs.com/package/hypercore-protocol
 */
declare module 'hypercore' {
  import { ProtocolStreamConstructor } from './hypercore-protocol';

  // Default constructor.
  // https://github.com/hypercore-protocol/hypercore-protocol#const-stream--new-protocolinitiator-options
  export const Protocol: ProtocolStreamConstructor = (
    initiator: boolean,
    options?: ProtocolStreamOptions
  ) => HypercoreFeedObject;

  export = Protocol;
}
