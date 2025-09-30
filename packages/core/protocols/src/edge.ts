//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

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

export type EdgeHttpSuccess<T> = {
  success: true;
  data: T;
};

export type EdgeErrorData = { type: string } & Record<string, any>;

export type EdgeHttpFailure = {
  // TODO(burdon): Why is this required?
  success: false;
  /**
   * An explanation of why the call failed. Used mostly for logging and monitoring.
   */
  reason: string;
  /**
   * Information that can be used to retry the request such that it will succeed, for example:
   * 1. { type: 'auth_required', challenge: string }
   *    Requires retrying the request with challenge signature included.
   * 2. { type: 'user_confirmation_required', dialog: { title: string, message: string, confirmation_payload: string } }
   *    Requires showing a confirmation dialog to a user and retrying the request with confirmation_payload included
   *    if the user confirms.
   * When errorData is returned simply retrying the request won't have any effect.
   * EdgeHttpClient should parse well-known errorData into Error types and throw.
   */
  errorData?: EdgeErrorData;
};

export type EdgeHttpResponse<T> = EdgeHttpSuccess<T> | EdgeHttpFailure;

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
};

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

export const DocumentCodec = {
  encode: (doc: Uint8Array) => Buffer.from(doc).toString('base64'),
  decode: (doc: string) => new Uint8Array(Buffer.from(doc, 'base64')),
};
