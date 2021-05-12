//
// Copyright 2020 DXOS.org
//

import fs from 'fs-extra';
import path from 'path';

import { FACTORY_OUT_DIR, FACTORY_BOT_DIR } from './config';

const testTeardown = async () => {
  await fs.remove(path.join(process.cwd(), FACTORY_OUT_DIR));
  await fs.remove(path.join(process.cwd(), FACTORY_BOT_DIR));
};

export default testTeardown;
