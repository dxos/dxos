const WORKER = Symbol.for('worker');
const EVENTS = Symbol.for('events');

class EventTarget {
  constructor() {
    Object.defineProperty(this, EVENTS, {
      value: new Map(),
    });
  }
  dispatchEvent(event) {
    event.target = event.currentTarget = this;
    if (this['on' + event.type]) {
      try {
        this['on' + event.type](event);
      } catch (err) {
        console.error(err);
      }
    }
    const list = this[EVENTS].get(event.type);
    if (list == null) return;
    list.forEach((handler) => {
      try {
        handler.call(this, event);
      } catch (err) {
        console.error(err);
      }
    });
  }
  addEventListener(type, fn) {
    let events = this[EVENTS].get(type);
    if (!events) this[EVENTS].set(type, (events = []));
    events.push(fn);
  }
  removeEventListener(type, fn) {
    let events = this[EVENTS].get(type);
    if (events) {
      const index = events.indexOf(fn);
      if (index !== -1) events.splice(index, 1);
    }
  }
}


export class IsomorphicWorker extends EventTarget {
  constructor(url: string | URL, options?: WorkerOptions) {
    if(typeof globalThis.Worker !== 'undefined') {
      return new globalThis.Worker(url, options);
    }

    super();
    const { name, type } = options || {};
    url += '';
    let mod;
    if (/^data:/.test(url)) {
      mod = url;
    } else {
      mod = fileURLToPath(new URL(url, baseUrl));
    }
    const worker = new threads.Worker(fileURLToPath(import.meta.url), { workerData: { mod, name, type } });
    Object.defineProperty(this, WORKER, {
      value: worker,
    });
    worker.on('message', (data) => {
      const event = new Event('message');
      event.data = data;
      this.dispatchEvent(event);
    });
    worker.on('error', (error) => {
      error.type = 'error';
      this.dispatchEvent(error);
    });
    worker.on('exit', () => {
      this.dispatchEvent(new Event('close'));
    });
  }
  postMessage(data, transferList) {
    this[WORKER].postMessage(data, transferList);
  }
  terminate() {
    this[WORKER].terminate();
  }
}
