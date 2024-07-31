var __dxlog_file = "input.js";
import { log } from '@dxos/log';
log('default', void 0, {
    F: __dxlog_file,
    L: 3,
    S: this,
    C: (f, a)=>f(...a)
});
log.debug('debug', void 0, {
    F: __dxlog_file,
    L: 4,
    S: this,
    C: (f, a)=>f(...a)
});
log.info('info', void 0, {
    F: __dxlog_file,
    L: 5,
    S: this,
    C: (f, a)=>f(...a)
});
log.warn('warn', void 0, {
    F: __dxlog_file,
    L: 6,
    S: this,
    C: (f, a)=>f(...a)
});
log.error('error', void 0, {
    F: __dxlog_file,
    L: 7,
    S: this,
    C: (f, a)=>f(...a)
});
log.catch(err, void 0, {
    F: __dxlog_file,
    L: 8,
    S: this,
    C: (f, a)=>f(...a)
});
