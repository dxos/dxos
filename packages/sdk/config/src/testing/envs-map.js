//
// Copyright 2024 DXOS.org
//

// TODO(wittjosiah): This should be JSON but isn't due to Nx TS build issue.
export default {
  TEST_CLIENT_ID: {
    path: 'runtime.client.id',
    type: 'number',
  },
  TEST_CLIENT_TAG: {
    path: 'runtime.client.tag',
  },
  TEST_SERVER_ENDPOINT: {
    path: 'runtime.server.endpoint',
  },
};
