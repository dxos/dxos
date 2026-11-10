//
// Copyright 2026 DXOS.org
//

/** The key of the marker `ref(obj)` returns in the isolate, which the host turns into a reference to `obj`. */
export const REF_MARKER = '$ref';

/**
 * The facade the model's code runs against inside a loaded isolate.
 *
 * Emitted as SOURCE rather than imported, because the isolate is a separate runtime with its own
 * module graph — nothing from this process can be handed to it except text. Every binding here is
 * a call home through `__host`, the function the host passes the isolate's entrypoint: the isolate
 * holds no database, only snapshots and the ids that name the real objects on the host.
 */
export const PRELUDE = `
let __host;
const __call = async (binding, args) => {
  const outcome = await __host(binding, args);
  if (outcome._tag !== 'Ok') {
    throw new Error(outcome.message);
  }
  return outcome.value;
};

// Kept in flight explicitly: \`print\` is synchronous in every dialect, but workerd cancels a
// call's pending I/O the moment it returns, so a fire-and-forget print is simply lost. The
// entrypoint drains \`__pending\` before it returns.
const __pending = [];
const print = (...values) => { __pending.push(__call('print', values)); };
const describe = (obj) => __call('describe', [obj]);
const relations = (obj, direction, type) => __call('relations', [obj, direction, type]);
const children = (obj) => __call('children', [obj]);
const referrers = (obj, type, field) => __call('referrers', [obj, type, field]);
const query = (typename, props) => __call('query', [typename, props]);
const make = (typename, props) => __call('make', [typename, props]);
const add = (obj) => __call('add', [obj]);
const remove = (obj) => __call('remove', [obj]);
const flush = () => __call('flush', []);

// A reference cannot cross either, so it is a marker naming the object, which the host turns into
// a reference wherever it is passed: a field of \`make\` or \`update\`, or an operation's input.
const ref = (obj) => ({ ${JSON.stringify(REF_MARKER)}: obj.id });

// The mutator cannot cross — a function is not structured-cloneable — so it is applied HERE to the
// snapshot and the resulting field changes are what travel. The model still writes the ordinary
// \`update(obj, (obj) => { obj.x = 1 })\`, and the snapshot is updated in place so later reads in
// the same program see the write.
const update = (obj, mutator) => {
  const before = JSON.parse(JSON.stringify(obj));
  mutator(obj);
  const patch = {};
  for (const key of Object.keys(obj)) {
    if (key !== 'id' && JSON.stringify(obj[key]) !== JSON.stringify(before[key])) {
      patch[key] = obj[key];
    }
  }
  return __call('update', [obj, patch]);
};

const __drain = () => Promise.all(__pending);

const ops = new Proxy({}, {
  get: (_target, name) => (input) => __call('invoke', [String(name), input ?? {}]),
  has: () => true,
});
`;
