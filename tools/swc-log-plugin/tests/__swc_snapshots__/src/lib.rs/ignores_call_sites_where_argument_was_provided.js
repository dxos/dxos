var __dxlog_file = "input.js";
import { log } from '@dxos/log';
import { Context } from '@dxos/context';
log("Hello", {}, {
    customMeta: 42
});
const ctx1 = new Context({
    customArg: 'foo'
});
