//
// Copyright 2022 DXOS.org
//

const { writeFile } = require('node:fs/promises');

const packageJson = require('../package.json');

const TELEMETRY_PATH = './src/util/telemetryrc.json';

const injectApiKeys = async () => {
  const telemetryrc = {
    DX_ENVIRONMENT: process.env.DX_ENVIRONMENT ?? null,
    DX_RELEASE: process.env.NODE_ENV === 'production' ? `dx-cli@${packageJson.version}` : null,
    SENTRY_DESTINATION: process.env.SENTRY_DESTINATION ?? null,
    TELEMETRY_API_KEY: process.env.TELEMETRY_API_KEY ?? null
  };

  await writeFile(TELEMETRY_PATH, JSON.stringify(telemetryrc, null, 2), 'utf-8');
};

void injectApiKeys();
