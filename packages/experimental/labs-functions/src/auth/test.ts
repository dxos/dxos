//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import { join } from 'node:path';

import { authenticate } from './oauth';

void authenticate({
  // Get keyfile from Google dashboard.
  keyfilePath: join(process.env.HOME!, '.config/dx/credentials/google-keyfile.json'),
  scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
}).then((client) => {
  const path = join(process.env.HOME!, '.config/dx/credentials/google.json');
  fs.writeFileSync(path, JSON.stringify(client.credentials, undefined, 2));
  console.log(`Credentials written to: ${path}`);
});
