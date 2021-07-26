//
// Copyright 2020 DxOS.
//

const pify = require('pify');
const hrtime = require('browser-process-hrtime');
const Bowser = require('bowser');

const { createStorage, STORAGE_RAM, STORAGE_IDB } = require('.');

const root = () => `.benchmark/${Date.now()}`;

const MAX = 100;

async function bench (title, execute) {
  const begin = hrtime();
  await execute();
  const diff = hrtime(begin);
  console.log(`${title} - ${(diff[1] / 1000000).toFixed(0)}ms`);
}

async function benchFile (createFile) {
  const st = createFile('benchmark.txt');

  // tiny writes

  const buf = Buffer.alloc(1);
  await bench(`${createFile.type}: ${MAX} tiny writes`, async () => {
    for (let i = 0; i < MAX; i++) {
      await pify(st.write.bind(st))(i, buf);
    }
  });

  // tiny reads

  await bench(`${createFile.type}: ${MAX} tiny reads`, async () => {
    for (let i = 0; i < MAX; i++) {
      await pify(st.read.bind(st))(i, 1);
    }
  });
}

const isBrowser = typeof window !== 'undefined';

(async () => {
  console.log('\nBenchmark on:', isBrowser ? Bowser.getParser(window.navigator.userAgent).getBrowserName() : 'Node');

  await benchFile(createStorage(root(), STORAGE_RAM));
  if (isBrowser) {
    await benchFile(createStorage(root(), STORAGE_IDB));
  }
  await benchFile(createStorage(root()));
  process.exit(0);
})();
