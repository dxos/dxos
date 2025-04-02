//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { SpaceId } from '@dxos/keys';

// TODO(burdon): Rename EdgerRouterEndpoint?
export enum EdgeService {
  AUTOMERGE_REPLICATOR = 'automerge-replicator',
  FEED_REPLICATOR = 'feed-replicator',
  SWARM = 'swarm',
  SIGNAL = 'signal',
}

export type EdgeHttpSuccess<T> = {
  success: true;
  data: T;
};

export type EdgeErrorData = { type: string } & Record<string, any>;

export type EdgeHttpFailure = {
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
  script: string;
  version: string;
};

export type UploadFunctionResponseBody = {
  functionId: string;
  version: string;
  meta: {
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
}

export const InitiateOAuthFlowRequestSchema = S.Struct({
  provider: S.Enums(OAuthProvider),
  spaceId: S.String.pipe(S.filter(SpaceId.isValid)),
  accessTokenId: S.String,
  scopes: S.mutable(S.Array(S.String)),
});
export type InitiateOAuthFlowRequest = S.Schema.Type<typeof InitiateOAuthFlowRequestSchema>;

export type InitiateOAuthFlowResponse = {
  authUrl: string;
};

export type OAuthFlowResult =
  | { success: true; accessToken: string; accessTokenId: string }
  | { success: false; reason: string };
