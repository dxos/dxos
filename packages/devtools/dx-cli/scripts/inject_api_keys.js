//
// Copyright 2022 DXOS.org
//

const { writeFile } = require('node:fs/promises');

const TELEMETRY_PATH = './dist/src/util/telemetryrc.json';

const injectApiKeys = async () => {
  const telemetryrc = {
    DX_ENVIRONMENT: process.env.DX_ENVIRONMENT,
    DX_RELEASE: process.env.DX_RELEASE,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SEGMENT_API_KEY: process.env.SEGMENT_API_KEY
  };

  await writeFile(TELEMETRY_PATH, JSON.stringify(telemetryrc), 'utf-8');
};

void injectApiKeys();
