//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import {
  type CheckEmailExistsResponse,
  type GetAccountResponse,
  type GetProfileUsageResponse,
  type IssueInvitationResponse,
  type ListAccountInvitationsResponse,
  type LoginRequest,
  type LoginResponse,
  type RedeemInvitationCodeRequest,
  type RedeemInvitationCodeResponse,
  type RequestAccessRequest,
  type RequestAccessResponse,
  type ResendVerificationEmailResponse,
  type ValidateInvitationCodeResponse,
} from '@dxos/protocols';
import { createUrl } from '@dxos/util';

import { BaseHttpClient, type BaseHttpClientOptions, type EdgeHttpCallArgs } from './base-http-client';

/**
 * HTTP client for the hub-service API (accounts, invitations, email verification).
 *
 * Hub-service and the edge worker are separate Cloudflare Workers deployed at different
 * URLs (`DX_HUB_URL` vs `DX_EDGE_URL`). This client is never used to talk to the edge
 * worker, and vice versa — keep them separate.
 *
 * NOTE: Do NOT set `auth: true` on any call here. Hub-service has no `/auth` VP-challenge
 * endpoint (it has an admin login page that 302s and is not CORS-enabled). Auth is handled
 * via the regular request → 401 → WWW-Authenticate challenge → retry path.
 */
export class HubHttpClient extends BaseHttpClient {
  constructor(hubUrl: string, options?: BaseHttpClientOptions) {
    super(hubUrl, options);
  }

  /**
   * Appends `path` to the base URL, keeping any path the base carries — hub is addressed under
   * EDGE's `/hub` prefix, and `new URL('/account/me', base)` would discard it.
   */
  #url(path: string): URL {
    return new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`);
  }

  //
  // Public (unauthenticated) endpoints
  //

  public async checkEmailExists(
    ctx: Context,
    body: { email: string },
    args?: EdgeHttpCallArgs,
  ): Promise<CheckEmailExistsResponse> {
    return this._call(ctx, this.#url('/account/email/exists'), { ...args, body, method: 'POST' });
  }

  public async validateInvitationCode(
    ctx: Context,
    body: { code: string },
    args?: EdgeHttpCallArgs,
  ): Promise<ValidateInvitationCodeResponse> {
    return this._call(ctx, this.#url('/account/invitation-code/validate'), {
      ...args,
      body,
      method: 'POST',
    });
  }

  public async redeemInvitationCode(
    ctx: Context,
    body: RedeemInvitationCodeRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<RedeemInvitationCodeResponse> {
    return this._call(ctx, this.#url('/account/invitation-code/redeem'), {
      ...args,
      body,
      method: 'POST',
    });
  }

  /**
   * Existing-account email recovery. The link is delivered out of band — the response never carries
   * a token. Test emails in dev-like environments short-circuit instead with `needsIdentity` /
   * `admitted` before any token exists. Enumeration-safe: the response is identical for unknown
   * emails. Account creation goes through {@link redeemInvitationCode}.
   */
  public async login(ctx: Context, body: LoginRequest, args?: EdgeHttpCallArgs): Promise<LoginResponse> {
    return this._call(ctx, this.#url('/account/login'), { ...args, body, method: 'POST' });
  }

  public async requestAccess(
    ctx: Context,
    body: RequestAccessRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<RequestAccessResponse> {
    return this._call(ctx, this.#url('/account/request-access'), { ...args, body, method: 'POST' });
  }

  //
  // Authenticated (VP) endpoints
  //

  public async getAccount(ctx: Context, args?: EdgeHttpCallArgs): Promise<GetAccountResponse> {
    return this._call(ctx, this.#url('/account/me'), { ...args, method: 'GET' });
  }

  public async deleteAccount(ctx: Context, args?: EdgeHttpCallArgs): Promise<{ deleted: boolean }> {
    return this._call(ctx, this.#url('/account/me'), { ...args, method: 'DELETE' });
  }

  public async listAccountInvitations(ctx: Context, args?: EdgeHttpCallArgs): Promise<ListAccountInvitationsResponse> {
    return this._call(ctx, this.#url('/account/invitation'), { ...args, method: 'GET' });
  }

  public async issueAccountInvitation(ctx: Context, args?: EdgeHttpCallArgs): Promise<IssueInvitationResponse> {
    return this._call(ctx, this.#url('/account/invitation/issue'), { ...args, method: 'POST' });
  }

  public async resendVerificationEmail(
    ctx: Context,
    args?: EdgeHttpCallArgs,
  ): Promise<ResendVerificationEmailResponse> {
    return this._call(ctx, this.#url('/account/email/resend-verification'), { ...args, method: 'POST' });
  }

  /**
   * Rolling-window usage and effective limits for the authenticated identity.
   * Served from the per-user metering DO; optional `windowSeconds` defaults to the largest limit window.
   */
  public async getProfileUsage(
    ctx: Context,
    query?: { windowSeconds?: number },
    args?: EdgeHttpCallArgs,
  ): Promise<GetProfileUsageResponse> {
    return this._call(
      ctx,
      createUrl(this.#url('/api/metering/profile/usage'), {
        windowSeconds: query?.windowSeconds,
      }),
      { ...args, method: 'GET' },
    );
  }
}
