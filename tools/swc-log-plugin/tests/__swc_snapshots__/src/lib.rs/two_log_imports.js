var __dxlog_file = "input.js";
import { log as dxosLog } from '@dxos/log';
import { log } from 'debug';
dxosLog('test 1', void 0, {
    F: __dxlog_file,
    L: 4,
    S: this,
    C: (f, a)=>f(...a)
});
log('test 2');
