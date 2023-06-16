//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import inspector from 'node:inspector';
import path from 'node:path';

const session = new inspector.Session();
const filename = `${new Date().toISOString()}.${process.pid}.cpuprofile`;
const destination = path.resolve(process.cwd(), filename);

export const mochaHooks = {
  beforeAll: (done: () => void) => {
    session.connect();
    session.post('Profiler.enable', () => session.post('Profiler.start', done));
  },
  afterAll: (done: (err?: Error) => void) => {
    session.post('Profiler.stop', (sessionErr, data) => {
      if (sessionErr) {
        done(sessionErr);
        return;
      }
      fs.writeFile(destination, JSON.stringify(data.profile), (writeErr) => {
        if (writeErr) {
          done(writeErr);
          return;
        }
        session.disconnect();
        console.log(`CPU profile written to ${destination}`);
        done();
      });
    });
  },
};
