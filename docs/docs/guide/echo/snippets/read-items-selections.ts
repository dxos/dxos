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

// filter selections by chaining
const selection = space.database
  .select({ type })
  .filter((item) => !item.deleted);
