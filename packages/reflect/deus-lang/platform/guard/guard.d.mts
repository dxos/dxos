//
// Copyright 2026 DXOS.org
//

export type GuardEnv = {
  CF_TOKEN: string;
  ACCOUNT_ID: string;
  WEBHOOK_SECRET: string;
  SELF: string;
  POLICY_IDS?: string;
};

export declare const BILLING_ALERTS: string[];

export declare const handle: (
  request: Request,
  env: GuardEnv,
  call: (url: string, init: RequestInit) => Promise<Response>,
) => Promise<Response>;

declare const guard: { fetch(request: Request, env: GuardEnv): Promise<Response> };
export default guard;
