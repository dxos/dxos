//
// Copyright 2022 DXOS.org
//

import { loadConfig } from './config.js';
import { generateApiDocs } from './generateApiDocs.js';
import { remarkDocumentation } from './remarkDocumentation.js';

const main = async () => {
  const config = await loadConfig();
  await generateApiDocs(config);
  await remarkDocumentation(config);
};

void main();
