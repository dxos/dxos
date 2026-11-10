//
// Copyright 2026 DXOS.org
//

//
// The facade the model's code runs against inside a `WorkerdSandbox` isolate. It is imported as text (`?raw`) and
// loaded as a module of the isolate, a separate runtime with its own module graph, so it has to stand alone: no
// imports. Every binding is a call home through the host the entrypoint installs: the isolate holds no database,
// only snapshots and the ids that name the real objects on the host.
//

let host;
let refMarker;

/** Hands the facade the function that answers its calls, and the key of the marker `ref` returns. */
export const install = (callHost, marker) => {
  host = callHost;
  refMarker = marker;
};

/** A refusal comes back as a value, since the runtime reports an RPC callee's throw as uncaught; it is raised here. */
const call = async (binding, args) => {
  const outcome = await host(binding, args);
  if (outcome._tag !== 'Ok') {
    throw new Error(outcome.message);
  }
  return outcome.value;
};

// Kept in flight explicitly: `print` and `update` are synchronous in every other dialect, so code does not await them,
// but workerd cancels a call's pending I/O the moment it returns, so a fire-and-forget call is simply lost. The
// entrypoint drains these before it returns.
const pending = [];
const updates = [];

/**
 * Waits for every print and update still in flight. A failed print, or a failed update the code never awaited, is
 * raised here; an update the code awaited reported its failure to the code already.
 */
export const drain = async () => {
  await Promise.all(pending);
  const settled = await Promise.allSettled(updates.map(({ promise }) => promise));
  const failed = settled.find((result, index) => result.status === 'rejected' && !updates[index].observed);
  if (failed !== undefined) {
    throw failed.reason;
  }
};

export const print = (...values) => {
  pending.push(call('print', values));
};
export const describe = (obj) => call('describe', [obj]);
export const relations = (obj, direction, type) => call('relations', [obj, direction, type]);
export const children = (obj) => call('children', [obj]);
export const referrers = (obj, type, field) => call('referrers', [obj, type, field]);
export const query = (typename, props) => call('query', [typename, props]);
export const make = (typename, props) => call('make', [typename, props]);
export const add = (obj) => call('add', [obj]);
export const remove = (obj) => call('remove', [obj]);
export const flush = () => call('flush', []);

// A reference cannot cross either, so it is a marker naming the object, which the host turns into a reference
// wherever it is passed: a field of `make` or `update`, or an operation's input.
export const ref = (obj) => {
  const id = typeof obj === 'string' ? obj : obj?.id;
  if (typeof id !== 'string') {
    throw new Error('ref() takes an object from query or make, or its id.');
  }
  return { [refMarker]: id };
};

// The mutator cannot cross — a function is not structured-cloneable — so it is applied HERE to the snapshot and the
// resulting field changes are what travel. The model still writes the ordinary `update(obj, (obj) => { obj.x = 1 })`,
// and the snapshot is updated in place so later reads in the same program see the write.
export const update = (obj, mutator) => {
  const before = JSON.parse(JSON.stringify(obj));
  mutator(obj);
  const patch = {};
  for (const key of Object.keys(obj)) {
    if (key !== 'id' && JSON.stringify(obj[key]) !== JSON.stringify(before[key])) {
      patch[key] = obj[key];
    }
  }
  const promise = call('update', [obj, patch]);
  // Handled here so an unawaited failure is not reported as unhandled; `drain` reports it unless the code awaited it.
  promise.catch(() => {});
  const entry = { promise, observed: false };
  updates.push(entry);
  // A thenable rather than the promise itself: `await` reads `then` only on a value that is not a native promise, and
  // reading it is how the code is seen to handle the update's outcome.
  const observe = () => {
    entry.observed = true;
    return promise;
  };
  return {
    then: (onFulfilled, onRejected) => observe().then(onFulfilled, onRejected),
    catch: (onRejected) => observe().catch(onRejected),
    finally: (onFinally) => observe().finally(onFinally),
  };
};

export const ops = new Proxy(
  {},
  {
    get: (_target, name) => (input) => call('invoke', [String(name), input ?? {}]),
    has: () => true,
  },
);
