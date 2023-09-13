//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  CancelledError,
  ConnectionResetError,
  ConnectivityError,
  DataCorruptionError,
  EntityNotFoundError,
  IdentityNotInitializedError,
  InvalidConfigError,
  InvalidInvitationError,
  InvalidInvitationExtensionRoleError,
  InvalidStorageVersionError,
  ProtocolError,
  RemoteServiceConnectionError,
  RemoteServiceConnectionTimeout,
  RpcClosedError,
  RpcNotOpenError,
  SpaceNotFoundError,
  SystemError,
  TimeoutError,
  UnknownModelError,
  UnknownProtocolError,
} from './errors';
import { Error as SerializedErrorProto } from '../proto/gen/dxos/error';

export const reconstructError = (error: SerializedErrorProto) => {
  const { name, message, context } = error;
  return errorFromCode(name, message, context);
};

export const errorFromCode = (code?: string, message?: string, context?: any) => {
  switch (code) {
    case 'RPC_CLOSED':
      return new RpcClosedError();

    case 'RPC_NOT_OPEN':
      return new RpcNotOpenError();

    case 'CANCELLED':
      return new CancelledError(message, context);

    case 'INVALID_CONFIG':
      return new InvalidConfigError(message, context);

    case 'REMOTE_SERVICE_CONNECTION_ERROR':
      return new RemoteServiceConnectionError(message, context);

    case 'REMOTE_SERVICE_CONNECTION_TIMEOUT':
      return new RemoteServiceConnectionTimeout(message, context);

    case 'DATA_CORRUPTION':
      return new DataCorruptionError(message, context);

    case 'INVALID_INVITATION_EXTENSION_ROLE':
      return new InvalidInvitationExtensionRoleError(message, context);

    case 'CONNECTION_RESET':
      return new ConnectionResetError(message, context);

    case 'TIMEOUT':
      return new TimeoutError(message, context);

    case 'PROTOCOL_ERROR':
      return new ProtocolError(message, context);

    case 'CONNECTIVITY_ERROR':
      return new ConnectivityError(message, context);

    case 'UNKNOWN_PROTOCOL_ERROR':
      return new UnknownProtocolError(message, context);

    case 'IDENTITY_NOT_INITIALIZED':
      return new IdentityNotInitializedError(message, context);

    case 'INVALID_INVITATION':
      return new InvalidInvitationError(message, context);

    case 'INVALID_STORAGE_VERSION': {
      const { expected, actual } = context;
      invariant(expected);
      invariant(actual);
      return new InvalidStorageVersionError(expected, actual);
    }

    case 'SPACE_NOT_FOUND': {
      const { spaceKey: key } = context;
      const spaceKey = PublicKey.safeFrom(key);
      invariant(spaceKey);
      return new SpaceNotFoundError(spaceKey);
    }

    case 'ITEM_NOT_FOUND': {
      const { entityId } = context;
      invariant(typeof entityId === 'string');
      return new EntityNotFoundError(entityId);
    }

    case 'UNKNOWN_MODEL': {
      const { model } = context;
      invariant(typeof model === 'string');
      return new UnknownModelError(model);
    }

    default:
      return new SystemError(code ?? 'Error', message, context);
  }
};
