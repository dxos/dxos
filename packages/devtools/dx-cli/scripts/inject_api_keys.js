//
// Copyright 2022 DXOS.org
//

const { readFile, writeFile } = require('node:fs/promises');

const TELEMETRY_PATH = './dist/src/util/telemetry.js';

const injectApiKeys = async () => {
  const contents = await readFile(TELEMETRY_PATH, 'utf-8');
  const injectedContents = contents
    .replace('process.env.DX_ENVIRONMENT', `'${process.env.DX_ENVIRONMENT}'`)
    .replace('process.env.DX_RELEASE', `'${process.env.DX_RELEASE}'`)
    .replace('process.env.SENTRY_DSN', `'${process.env.SENTRY_DSN}'`)
    .replace('process.env.SEGMENT_API_KEY', `'${process.env.SEGMENT_API_KEY}'`);
  await writeFile(TELEMETRY_PATH, injectedContents, 'utf-8');
};

void injectApiKeys();
