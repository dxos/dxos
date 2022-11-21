import { log } from "./log";
import { logInfo } from "./scope";

describe.only('Scope capture', () => {
  it('field instance', function () {
 
    class Outer {

      constructor(private readonly _id: string) {}

      @logInfo
      get id() {
        return this._id;
      }

      run() {
        log('run')
      }
    }

    const foo = new Outer('foo');
    const bar = new Outer('bar');

    foo.run();
    bar.run();
  });
})