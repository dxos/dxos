// #!/usr/bin/env node --loader ts-node/esm

// //
// // Copyright 2022 DXOS.org
// //

import '../dist/src/main.js';

// import path from 'path';
// import * as url from 'url';
// import { createServer } from 'vite';
// import { ViteNodeRunner } from 'vite-node/client';
// import { ViteNodeServer } from 'vite-node/server';
// import { installSourcemapsSupport } from 'vite-node/source-map';

// // const __filename = url.fileURLToPath(import.meta.url);
// const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// const main = async () => {
//   // create vite server
//   const server = await createServer({
//     optimizeDeps: {
//       // It's recommended to disable deps optimization
//       disabled: true,
//     },
//   });
//   // this is need to initialize the plugins
//   await server.pluginContainer.buildStart({});

//   // create vite-node server
//   const node = new ViteNodeServer(server);

//   // fixes stacktraces in Errors
//   installSourcemapsSupport({
//     getSourceMap: (source) => node.getSourceMap(source),
//   });

//   // create vite-node runner
//   const runner = new ViteNodeRunner({
//     root: server.config.root,
//     base: server.config.base,
//     // when having the server and runner in a different context,
//     // you will need to handle the communication between them
//     // and pass to this function
//     fetchModule: (id) => node.fetchModule(id),
//     resolveId: (id, importer) => node.resolveId(id, importer),
//   });

//   // execute the file
//   await runner.executeFile(path.resolve(__dirname, '../dist/src/main.js'));

//   console.log('done, closing vite');
//   // close the vite server
//   await server.close();
// };

// void main();
