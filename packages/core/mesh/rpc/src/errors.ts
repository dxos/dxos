//
// Copyright 2021 DXOS.org
//

import { StackTrace } from '@dxos/debug';
import { decodeError } from '@dxos/protocols';
import { Error as ErrorResponse } from '@dxos/protocols/proto/dxos/error';

export const decodeRpcError = (err: ErrorResponse, rpcMethod: string): Error =>
  decodeError(err, {
    appendStack: `\n    at RPC ${rpcMethod} \n` + new StackTrace().getStack(1),
  });
