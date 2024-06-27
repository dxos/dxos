var __dxlog_file = "input.js";
import { log as dxosLog } from '@dxos/log';
import { Context as Ctx } from '@dxos/context';
dxosLog('test', void 0, {
    F: __dxlog_file,
    L: 4,
    S: this,
    C: (f, a)=>f(...a)
});
dxosLog.debug('debug', void 0, {
    F: __dxlog_file,
    L: 5,
    S: this,
    C: (f, a)=>f(...a)
});
new Ctx({
    F: __dxlog_file,
    L: 6
});
