//
// Copyright 2020 DXOS.org
//

export { Config, Defaults, Dynamics, Envs, Local } from '@dxos/config';
export { PublicKey, type PublicKeyLike } from '@dxos/keys';
export { ApiError } from '@dxos/errors';
export { Client, ClientOptions } from './client/client';

// TODO(mykola): Do not expose SpaceProxy.
export { SpaceProxy } from './echo';
