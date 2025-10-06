#!/usr/bin/env node

//
// Copyright 2022 DXOS.org
//

import { writeFile } from 'node:fs/promises';

const OBSERVABILITY_PATH = './src/cli-observability-secrets.json';

const secrets = {
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY ?? null,
  IPDATA_API_KEY: process.env.DX_IPDATA_API_KEY ?? null,
  OTEL_ENDPOINT: process.env.DX_OTEL_ENDPOINT ?? null,
  OTEL_AUTHORIZATION: process.env.DX_OTEL_AUTHORIZATION ?? null,
};

await writeFile(OBSERVABILITY_PATH, JSON.stringify(secrets, null, 2), 'utf-8');
