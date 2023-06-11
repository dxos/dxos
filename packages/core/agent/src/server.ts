//
// Copyright 2023 DXOS.org
//

import express from 'express';

// TODO(burdon): Express ECHO http server (with Client to daemon/agent).
// TODO(burdon): Factor out daemon from CLI.
// TODO(burdon): GET Query/POST upsert.

const server = () => {
  const app = express();
  app.listen(3000, () => {
    console.log('running...');
  });
};

server();
