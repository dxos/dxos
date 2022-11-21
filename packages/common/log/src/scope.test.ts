import { log } from "./log";
import { logInfo } from "./scope";

describe('Scope capture', () => {
  it('field instance', function () {
    class Container {
      constructor(private readonly _id: string) { }

      @logInfo
      get id() {
        return this._id;
      }

      run() {
        log('run')
      }
    }

    const foo = new Container('foo');
    const bar = new Container('bar');

    foo.run();
    bar.run();
  });
})