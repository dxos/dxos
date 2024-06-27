var __dxlog_file = "input.js";
import { log } from '@dxos/log';
log('test1', void 0, {
    F: __dxlog_file,
    L: 3,
    S: this,
    C: (f, a)=>f(...a)
});
some.other.code();
//comment
log('test2', void 0, {
    F: __dxlog_file,
    L: 8,
    S: this,
    C: (f, a)=>f(...a)
});
