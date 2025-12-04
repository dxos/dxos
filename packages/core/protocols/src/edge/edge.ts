//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

// TODO(burdon): Rename EdgerRouterEndpoint.
// If we would rename it, we need to be careful to not break composer production.
export enum EdgeService {
  AUTOMERGE_REPLICATOR = 'automerge-replicator',
  FEED_REPLICATOR = 'feed-replicator',
  SWARM = 'swarm',
  SIGNAL = 'signal',
  STATUS = 'status',
}

export type EdgeSuccess<T> = {
  success: true;
  data: T;
};

const _SerializedError = Schema.Struct({
  code: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  context: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  stack: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.suspend(() => SerializedError)),
});
export interface SerializedError extends Schema.Schema.Type<typeof _SerializedError> {}
export const SerializedError: Schema.Schema<SerializedError, SerializedError, never> = _SerializedError;

export type EdgeErrorData = { type: string } & Record<string, any>;

/**
 * This is the shape of the error response from the Edge service,
 * when the error is gracefully handled, the Response will be an object with this shape and have status code 200.
 */
// TODO(dmaretskyi): Refactor this type to just be { success: false, error: SerializedError }
// reason -> error.message
// cause -> error.cause
// data.type -> error.code
// ...data -> error.context
export type EdgeFailure = {
  /**
   * Branded Type.
   */
  success: false;
  /**
   * An explanation of why the call failed. Used mostly for logging and monitoring.
   */
  message: string;
  /**
   * Cause Error captured on the EDGE service to aid debugging on the client.
   */
  error?: SerializedError;
  /**
   * Information that can be used to retry the request such that it will succeed, for example:
   * 1. { type: 'auth_required', challenge: string }
   *    Requires retrying the request with challenge signature included.
   * 2. { type: 'user_confirmation_required', dialog: { title: string, message: string, confirmation_payload: string } }
   *    Requires showing a confirmation dialog to a user and retrying the request with confirmation_payload included
   *    if the user confirms.
   * When data is returned simply retrying the request won't have any effect.
   * EdgeHttpClient should parse well-known data into Error types and throw.
   */
  data?: EdgeErrorData;
};

/**
 * Represents a body response from the Edge service.
 */
export type EdgeEnvelope<T> = EdgeSuccess<T> | EdgeFailure;

/**
 * Use this to create a response from the Edge service.
 */
export const EdgeResponse = Object.freeze({
  success: <T>(data: T, status: number = 200): Response => {
    invariant(status >= 200 && status < 300, 'Status code must be in the 2xx range');
    const headers = new Headers({ 'Content-Type': 'application/json' });
    return new Response(
      JSON.stringify({
        success: true,
        data,
      } satisfies EdgeSuccess<T>),
      {
        status,
        headers,
      },
    );
  },
  failure: ({
    message,
    error,
    errorEncoded,
    data,
    shouldRetryAfter,
    status = 500,
  }: {
    /**
     * An explanation of why the call failed. Used mostly for logging and monitoring.
     */
    message: string;
    /**
     * Error that caused the failure.
     * Useful for debugging.
     *
     * Use only one of the fields `error` or `errorEncoded`.s
     */
    error?: Error;
    /**
     * Encoded Error that caused the failure.
     * Useful for debugging.
     *
     * Use only one of the fields `error` or `errorEncoded`.
     */
    errorEncoded?: SerializedError;

    /**
     * Information that can be used to retry the request such that it will succeed, for example:
     * 1. { type: 'auth_required', challenge: string }
     *    Requires retrying the request with challenge signature included.
     * 2. { type: 'user_confirmation_required', dialog: { title: string, message: string, confirmation_payload: string } }
     *    Requires showing a confirmation dialog to a user and retrying the request with confirmation_payload included
     *    if the user confirms.
     * When data is returned simply retrying the request won't have any effect.
     * EdgeHttpClient should parse well-known data into Error types and throw.
     */
    data?: EdgeErrorData;
    /**
     * If provided, this request will be marked as retryable and the client will wait for the specified number of milliseconds before retrying.
     * If not provided, the client will not retry the request.
     */
    shouldRetryAfter?: number;

    /**
     * Status code of the response.
     * @default 500
     */
    status?: number;
  }): Response => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (shouldRetryAfter) {
      headers.set('Retry-After', String(shouldRetryAfter));
    }

    return new Response(
      JSON.stringify({
        success: false,
        message,
        data,
        error: error ? ErrorCodec.encode(error) : errorEncoded,
      } satisfies EdgeFailure),
      {
        status,
        headers,
      },
    );
  },
});

export type GetNotarizationResponseBody = {
  awaitingNotarization: { credentials: string[] };
};

export type ExecuteWorkflowResponseBody = {
  success: boolean;
  reason?: string;
  output?: any;
};

export type PostNotarizationRequestBody = {
  credentials: string[];
};

export type JoinSpaceRequest = {
  invitationId: string;
  identityKey: string;
  /**
   * Base64 encoded signed challenge.
   * Used to verify the IdentityKey in case of `invitation.authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY`
   */
  signature?: string;
};

export type JoinSpaceResponseBody = {
  spaceMemberCredential: string;
  spaceGenesisFeedKey: string;
};

export type RecoverIdentitySignature =
  | string
  // This is the format of the signature from the WebAuthn authenticator.
  | {
      signature: string;
      clientDataJson: string;
      authenticatorData: string;
    };

export type RecoverIdentityRequest = {
  deviceKey: string;
  controlFeedKey: string;
  lookupKey?: string;
  signature?: RecoverIdentitySignature;
  token?: string;
};

export type RecoverIdentityResponseBody = {
  identityKey: string;
  haloSpaceKey: string;
  genesisFeedKey: string;
  deviceAuthCredential: string;
};

export type CreateAgentRequestBody = {
  identityKey: string;
  haloSpaceId: SpaceId;
  haloSpaceKey: string;
};

export type CreateAgentResponseBody = {
  deviceKey: string;
  feedKey: string;
};

export type GetAgentStatusResponseBody = {
  agent: {
    deviceKey?: string;
    status: EdgeAgentStatus;
  };
};

export type UploadFunctionRequest = {
  name?: string;
  version: string;
  ownerPublicKey: string;
  entryPoint: string;
  assets: Record<string, Uint8Array>;
  /**
   * Runtime in Edge that will be used to run the function.
   * Runtime cannot be changed once the function was deployed.
   * @default Runtime.WORKERS_FOR_PLATFORMS
   */
  runtime?: FunctionRuntimeKind;
};

/**
 * Note: Do not change the values of these enums, this values are stored in the FunctionVersions database.
 */
export const FunctionRuntimeKind = Schema.Enums({
  // https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
  WORKERS_FOR_PLATFORMS: 'WORKERS_FOR_PLATFORMS',
  // https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/
  WORKER_LOADER: 'WORKER_LOADER',
  // Local worker dispatcher for testing.
  /**
   * @deprecated No longer supported.
   */
  TEST: 'TEST',
});
export type FunctionRuntimeKind = Schema.Schema.Type<typeof FunctionRuntimeKind>;

export type UploadFunctionResponseBody = {
  functionId: string;
  version: string;
  meta: {
    key?: string;
    name?: string;
    description?: string;
    /**
     * JSON Schema for the input of the function.
     */
    inputSchema?: object;
    /**
     * JSON Schema for the output of the function.
     */
    outputSchema?: object;
  };
};

export type CreateSpaceRequest = {
  /**
   * HEX encoded public key of the agent.
   */
  agentKey: string;
};

export type CreateSpaceResponseBody = {
  /**
   * HEX encoded public key of the space.
   */
  spaceKey: string;
  spaceId: SpaceId;
  automergeRoot: string;
};

export enum EdgeAgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  NOT_FOUND = 'not_found',
}

export type EdgeAuthChallenge = {
  type: 'auth_challenge';
  challenge: string;
};

export enum OAuthProvider {
  GOOGLE = 'google',
  BLUESKY = 'bluesky',
}

export const InitiateOAuthFlowRequestSchema = Schema.Struct({
  provider: Schema.Enums(OAuthProvider),
  spaceId: Schema.String.pipe(Schema.filter(SpaceId.isValid)), // TODO(burdon): Use SpaceId.
  accessTokenId: Schema.String,
  scopes: Schema.mutable(Schema.Array(Schema.String)),
  // Set to true if we don't want periodic token refreshes in background, for cases like account connect
  noRefresh: Schema.optional(Schema.Boolean),
  // Provider-specific (user handle or did for bluesky) hint for auth server resolution
  loginHint: Schema.optional(Schema.String),
});
export type InitiateOAuthFlowRequest = Schema.Schema.Type<typeof InitiateOAuthFlowRequestSchema>;

export type InitiateOAuthFlowResponse = {
  authUrl: string;
};

export type OAuthFlowResult =
  | { success: true; accessToken: string; accessTokenId: string }
  | { success: false; reason: string };

export enum EdgeWebsocketProtocol {
  V0 = 'edge-ws-v0',
  /**
   * Enables message framing and muxing by service-id.
   */
  V1 = 'edge-ws-v1',
}

// TODO(mykola): Reconcile with type in EDGE repo.
export type EdgeStatus = {
  problems: string[];
  agent: {
    agentStatus?: string;
    agentKey?: string;
    haloSpaceId?: SpaceId;
    fetchError?: string;
  };
  router: {
    connectedDevices?: {
      peerKey: string;
      topics: string[];
    }[];
    metrics?: {
      sentMessages: number;
      receivedMessages: number;
      sentBytes: number;
      receivedBytes: number;
      failedMessages: number;
      failedBytes: number;
    };
    fetchError?: string;
  };
  spaces: {
    data: Record<SpaceId, { diagnostics?: any & { redFlags: string[] }; fetchError?: string }>;
    fetchError?: string;
  };
};

//
// Space import/export.
//

export type ImportBundleRequest = {
  bundle: {
    /**
     * DocumentId.
     */
    documentId: string;
    /**
     * Encoded mutation.
     */
    mutation: string;
    /**
     * Heads of the document.
     */
    heads: string[];
  }[];
};

export type ExportBundleRequest = {
  /**
   * DocumentId -> Heads (decoded heads since which we want to export).
   */
  docHeads: Record<string, string[]>;
};

export type ExportBundleResponse = {
  bundle: {
    /**
     * DocumentId.
     */
    documentId: string;
    /**
     * Encoded mutation.
     */
    mutation: string;
  }[];
};

export const DocumentCodec = Object.freeze({
  encode: (doc: Uint8Array) => Buffer.from(doc).toString('base64'),
  decode: (doc: string) => new Uint8Array(Buffer.from(doc, 'base64')),
});

const MAX_ERROR_DEPTH = 3;

/**
 * Codec for serializing and deserializing Edge Errors.
 */
export const ErrorCodec = Object.freeze({
  encode: (err: Error, depth: number = 0): SerializedError => ({
    code: 'code' in err ? (err as any).code : undefined,
    message: err.message,
    stack: err.stack,
    cause: err.cause instanceof Error && depth < MAX_ERROR_DEPTH ? ErrorCodec.encode(err.cause, depth + 1) : undefined,
  }),
  decode: (serializedError: SerializedError, depth: number = 0): Error => {
    let err: Error;
    if (typeof serializedError.code === 'string') {
      err = new BaseError(serializedError.code, {
        message: serializedError.message ?? 'Unknown error',
        cause:
          serializedError.cause && depth < MAX_ERROR_DEPTH
            ? ErrorCodec.decode(serializedError.cause, depth + 1)
            : undefined,
        context: serializedError.context,
      });

      if (serializedError.stack) {
        Object.defineProperty(err, 'stack', {
          value: serializedError.stack,
        });
      }
    } else {
      err = new Error(serializedError.message ?? 'Unknown error', {
        cause:
          serializedError.cause && depth < MAX_ERROR_DEPTH
            ? ErrorCodec.decode(serializedError.cause, depth + 1)
            : undefined,
      });

      if (serializedError.stack) {
        Object.defineProperty(err, 'stack', {
          value: serializedError.stack,
        });
      }
    }

    return err;
  },
});

/**
 * Codec for serializing and deserializing Edge unhandled HTTP errors.
 */
export const EdgeHttpErrorCodec = Object.freeze({
  encode: (err: Error): Response =>
    new Response(
      JSON.stringify({
        error: ErrorCodec.encode(err),
      }),
      { status: 500 },
    ),

  decode: async (response: Response): Promise<Error | undefined> => {
    if (response.headers.get('Content-Type') !== 'application/json') {
      const body = await response.clone().text();
      return new Error(body.slice(0, 256));
    }

    const body = await response.clone().json();
    if (!('error' in body)) {
      return undefined;
    }

    return ErrorCodec.decode(body.error);
  },
});
