//
// Copyright 2023 DXOS.org
//

import express from 'express';

// TODO(burdon): Express ECHO http server (with Client to daemon/agent).
// TODO(burdon): Factor out daemon from CLI.
// TODO(burdon): GET Query/POST upsert.

const port = 3000;

const start = () => {
  console.log('starting...');
  const app = express();
  app.use(express.json());

  // TODO(burdon): Test with https://github.com/micha/resty
  // curl -i -w '\n' -X POST -H "Content-Type: application/json" -d "{}" localhost:3000/query
  app.post('/query', (req, res) => {
    const query = req.body;
    console.log('exec', { query: JSON.stringify(query) });
    res.json([]);
  });

  app.listen(port, () => {
    console.log('listening', { port });
  });
};

start();
