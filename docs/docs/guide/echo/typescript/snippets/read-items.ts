//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

const space = spaces[0];

// query items by selecting them
const selection = space.database.select({ type });
