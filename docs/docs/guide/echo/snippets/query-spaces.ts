//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();