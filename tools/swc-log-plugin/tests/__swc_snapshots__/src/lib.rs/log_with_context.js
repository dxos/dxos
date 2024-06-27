var __dxlog_file = "input.js";
import { log } from '@dxos/log';
log('foo', {
    key: 'value'
}, {
    F: __dxlog_file,
    L: 3,
    S: this,
    C: (f, a)=>f(...a)
});
