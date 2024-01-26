//
// Copyright 2022 DXOS.org
//

const { writeFile } = require('node:fs/promises');

const OBSERVABILITY_PATH = './src/cli-observability-secrets.json';

const injectApiKeys = async () => {
  const secrets = {
    SENTRY_DESTINATION: process.env.DX_SENTRY_DESTINATION ?? null,
    TELEMETRY_API_KEY: process.env.DX_TELEMETRY_API_KEY ?? null,
    IPDATA_API_KEY: process.env.DX_IPDATA_API_KEY ?? null,
    DATADOG_API_KEY: process.env.DX_DATADOG_API_KEY ?? null,
    DATADOG_APP_KEY: process.env.DX_DATADOG_APP_KEY ?? null,
  };

  await writeFile(OBSERVABILITY_PATH, JSON.stringify(secrets, null, 2), 'utf-8');
};

void injectApiKeys();
