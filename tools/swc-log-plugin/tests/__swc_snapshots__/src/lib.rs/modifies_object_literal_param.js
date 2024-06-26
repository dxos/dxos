var __dxlog_file = "input.js";
import { log } from '@dxos/log';
import { Context } from '@dxos/context';
log("Hello", {}, {
    customMeta: 42,
    F: __dxlog_file,
    L: 4,
    S: this,
    C: (f, a)=>f(...a)
});
const ctx1 = new Context({
    customArg: 'foo',
    F: __dxlog_file,
    L: 5
});
