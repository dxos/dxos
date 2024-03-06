//
// Copyright 2023 DXOS.org
//

import '@dxos/shell/style.css';

// NOTE: This is using bundled output from @dxos/shell and does not automatically rebuild on changes.
//  This is intentional to demonstrate the use of the shell as an external dependency.
import { log } from '@dxos/log';
import { runShell } from '@dxos/shell';

import { getConfig } from './config';

const main = async () => {
  log.info(process.env.NODE_ENV ?? '');
  const config = await getConfig();
  await runShell(config);
};

void main();
