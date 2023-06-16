import fs from "node:fs";
import inspector from "node:inspector";
import path from "node:path";

const session = new inspector.Session();
const filename = `${new Date().toISOString()}.${process.pid}.cpuprofile`;
const destination = path.resolve(process.cwd(), filename);

export const mochaHooks = {
  beforeAll(done: () => void) {
    session.connect();
    return void session.post('Profiler.enable', () => void session.post('Profiler.start', done));
  },
  afterAll(done: (err?: Error) => void) {
    session.post('Profiler.stop', (sessionErr, data) => {
      if (sessionErr) {
        return void done(sessionErr);
      }
      return void fs.writeFile(destination, JSON.stringify(data.profile), writeErr => {
        if (writeErr) {
          return void done(writeErr);
        }
        session.disconnect();
        console.log(`CPU profile written to ${destination}`)
        return void done();
      });
    });
  },
};
