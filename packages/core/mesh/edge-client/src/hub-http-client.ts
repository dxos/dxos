//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import {
  type CheckEmailExistsResponse,
  type GetAccountResponse,
  type IssueInvitationResponse,
  type ListAccountInvitationsResponse,
  type LoginRequest,
  type LoginResponse,
  type RedeemInvitationCodeRequest,
  type RedeemInvitationCodeResponse,
  type RequestAccessRequest,
  type RequestAccessResponse,
  type GetProfileUsageResponse,
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

  //
  // Public (unauthenticated) endpoints
  //

  public async checkEmailExists(
    ctx: Context,
    body: { email: string },
    args?: EdgeHttpCallArgs,
  ): Promise<CheckEmailExistsResponse> {
    return this._call(ctx, new URL('/account/email/exists', this.baseUrl), { ...args, body, method: 'POST' });
  }

  public async validateInvitationCode(
    ctx: Context,
    body: { code: string },
    args?: EdgeHttpCallArgs,
  ): Promise<ValidateInvitationCodeResponse> {
    return this._call(ctx, new URL('/account/invitation-code/validate', this.baseUrl), {
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
    return this._call(ctx, new URL('/account/invitation-code/redeem', this.baseUrl), {
      ...args,
      body,
      method: 'POST',
    });
  }

  /**
   * Existing-account email login. Server inlines `token` for test emails; regular
   * emails are delivered out-of-band. Response is identical for unknown emails
   * (enumeration-safe).
   */
  public async login(ctx: Context, body: LoginRequest, args?: EdgeHttpCallArgs): Promise<LoginResponse> {
    return this._call(ctx, new URL('/account/login', this.baseUrl), { ...args, body, method: 'POST' });
  }

  public async requestAccess(
    ctx: Context,
    body: RequestAccessRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<RequestAccessResponse> {
    return this._call(ctx, new URL('/account/request-access', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Authenticated (VP) endpoints
  //

  public async getAccount(ctx: Context, args?: EdgeHttpCallArgs): Promise<GetAccountResponse> {
    return this._call(ctx, new URL('/account/me', this.baseUrl), { ...args, method: 'GET' });
  }

  public async deleteAccount(ctx: Context, args?: EdgeHttpCallArgs): Promise<{ deleted: boolean }> {
    return this._call(ctx, new URL('/account/me', this.baseUrl), { ...args, method: 'DELETE' });
  }

  public async listAccountInvitations(ctx: Context, args?: EdgeHttpCallArgs): Promise<ListAccountInvitationsResponse> {
    return this._call(ctx, new URL('/account/invitation', this.baseUrl), { ...args, method: 'GET' });
  }

  public async issueAccountInvitation(ctx: Context, args?: EdgeHttpCallArgs): Promise<IssueInvitationResponse> {
    return this._call(ctx, new URL('/account/invitation/issue', this.baseUrl), { ...args, method: 'POST' });
  }

  public async resendVerificationEmail(
    ctx: Context,
    args?: EdgeHttpCallArgs,
  ): Promise<ResendVerificationEmailResponse> {
    return this._call(ctx, new URL('/account/email/resend-verification', this.baseUrl), { ...args, method: 'POST' });
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
      createUrl(new URL('/api/metering/profile/usage', this.baseUrl), {
        windowSeconds: query?.windowSeconds,
      }),
      { ...args, method: 'GET' },
    );
  }

  //
  // Admin (admin-key) endpoints. Require an `ApiKeyAuth` instance — the
  // verifiable-presentation flow does not satisfy `adminAuth`.
  //

  public async adminListAccounts(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/account', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminGetAccount(ctx: Context, identityDid: string, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL(`/api/account/${identityDid}`, this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminGrantInvitations(
    ctx: Context,
    identityDid: string,
    count: number,
    args?: EdgeHttpCallArgs,
  ): Promise<any> {
    return this._call(ctx, new URL(`/api/account/${identityDid}/invitations/grant`, this.baseUrl), {
      ...args,
      method: 'POST',
      body: { count },
    });
  }

  public async adminListWaitlist(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/waitlist', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminApproveWaitlistEntry(ctx: Context, id: number, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL(`/api/waitlist/${id}/approve`, this.baseUrl), { ...args, method: 'POST' });
  }

  public async adminRemoveWaitlistEntry(ctx: Context, id: number, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL(`/api/waitlist/${id}`, this.baseUrl), { ...args, method: 'DELETE' });
  }

  public async adminListInvitationCodes(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/code', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminCreateInvitationCodes(
    ctx: Context,
    body: { count?: number; quota?: number; note?: string },
    args?: EdgeHttpCallArgs,
  ): Promise<any> {
    return this._call(ctx, new URL('/api/code', this.baseUrl), { ...args, method: 'POST', body });
  }

  public async adminRevokeInvitationCode(ctx: Context, code: string, args?: EdgeHttpCallArgs): Promise<void> {
    return this._call(ctx, new URL(`/api/code/${code}`, this.baseUrl), { ...args, method: 'DELETE' });
  }

  public async adminDeleteInvitationCode(ctx: Context, code: string, args?: EdgeHttpCallArgs): Promise<void> {
    return this._call(ctx, new URL(`/api/code/${code}/permanent`, this.baseUrl), { ...args, method: 'DELETE' });
  }

  public async adminListMessages(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/admin/messages', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminListMagicLinks(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/admin/magic-links', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminSendEmail(
    ctx: Context,
    body: { from: string; to: string; subject: string; body?: string },
    args?: EdgeHttpCallArgs,
  ): Promise<any> {
    return this._call(ctx, new URL('/api/admin/email', this.baseUrl), { ...args, method: 'POST', body });
  }

  public async adminGetServices(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/admin/services', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminListTemplates(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/admin/templates', this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminGetTemplate(ctx: Context, type: string, name: string, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL(`/api/admin/templates/${type}/${name}`, this.baseUrl), { ...args, method: 'GET' });
  }

  public async adminRunDiagnostics(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/admin/util/diagnostics', this.baseUrl), { ...args, method: 'POST' });
  }

  public async adminRunSync(
    ctx: Context,
    body: { endpoint: 'ghost' | 'kit'; count?: number },
    args?: EdgeHttpCallArgs,
  ): Promise<any> {
    return this._call(ctx, new URL('/api/admin/util/sync', this.baseUrl), { ...args, method: 'POST', body });
  }

  public async adminListRoutes(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/api/admin/routes', this.baseUrl), { ...args, method: 'GET' });
  }
}
