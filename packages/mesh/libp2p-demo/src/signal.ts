//
// Copyright 2020 DXOS.org
//

// import { sigServer } from '@libp2p/webrtc-star-signalling-server';
// const x = require('@libp2p/webrtc-star-signalling-server');
// console.log(x);

const server = async () => {
  const { sigServer } = await eval('import("@libp2p/webrtc-star-signalling-server")');

  const server = await sigServer({
    port: 24642, // TODO(burdon): ???
    host: '0.0.0.0',
    metrics: false
  });

  // console.log(server);
  // await server.stop();
};

void server();
