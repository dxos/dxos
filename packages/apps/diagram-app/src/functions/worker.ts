//
// Copyright 2026 DXOS.org
//

import * as OtelProxy from '@dxos/observability/OtelProxy';

export type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  POSTHOG_OTLP_URL?: string;
  POSTHOG_PROJECT_TOKEN?: string;
};

const OTEL_MAX_BODY_SIZE = 64 * 1024 * 1024;

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const otel = OtelProxy.handle(request, {
      url: env.POSTHOG_OTLP_URL,
      token: env.POSTHOG_PROJECT_TOKEN,
      maxBodySize: OTEL_MAX_BODY_SIZE,
    });
    return otel ?? env.ASSETS.fetch(request);
  },
};
