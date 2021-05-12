//
// Copyright 2020 DXOS.org
//

import fs from 'fs-extra';
import path from 'path';

import { FACTORY_OUT_DIR } from './config';

const testTeardown = async () => {
  await fs.remove(path.join(process.cwd(), FACTORY_OUT_DIR));
};

export default testTeardown;
