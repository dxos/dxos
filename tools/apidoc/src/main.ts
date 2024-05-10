//
// Copyright 2022 DXOS.org
//

import { loadConfig } from './config.js';
import { generateApiDocs } from './generateApiDocs.js';
import { remarkDocumentation } from './remarkDocumentation.js';

const main = async () => {
  const config = await loadConfig();
  const flags = process.argv.slice(2);
  const tasks = {
    apidoc: generateApiDocs,
    remark: remarkDocumentation,
  };
  const plan = flags?.length ? flags : Object.keys(tasks);
  await Promise.all(plan.map((step: string) => (step in tasks ? tasks[step as keyof typeof tasks]?.(config) : null)));
};

void main();
