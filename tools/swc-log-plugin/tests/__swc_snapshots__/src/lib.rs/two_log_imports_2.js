var __dxlog_file = "input.js";
import { log } from '@dxos/log';
import { log as debugLog } from 'debug';
log('test 1', void 0, {
    F: __dxlog_file,
    L: 4,
    S: this,
    C: (f, a)=>f(...a)
});
debugLog('test 2');
