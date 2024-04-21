//
// Copyright 2024 DXOS.org
//

import { type Ai } from '@cloudflare/ai';

import { type SignalingObject } from './signaling';

// TODO(burdon): YAML file for config.
export const DISCORD_INVITE_URL = 'https://discord.gg/PTA7ThQQ';

/**
 * Secrets management.
 * https://developers.cloudflare.com/workers/configuration/secrets
 */
export type Env = {
  Bindings: {
    WORKER_ENV: 'production' | 'local';

    // Admin API key.
    API_KEY: string;

    // JWT Cookie.
    JWT_SECRET: string;

    DB: D1Database;
    SIGNALING: DurableObjectNamespace<SignalingObject>;
    AI: Ai;
  };
};
