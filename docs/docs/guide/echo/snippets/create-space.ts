//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

const space = await client.echo.createSpace();
