//
// Copyright 2022 DXOS.org
//

import { Client, DocumentModel } from '@dxos/client';

const client = new Client();

// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

// create a regular DocumentModel item
const item = await spaces[0].database.createItem({
  type,
  model: DocumentModel
});

// set a property value
item.model.set('someKey', 'someValue');

// query items
const items = spaces[0].database.select({ type });
