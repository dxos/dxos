//
// Copyright 2026 DXOS.org
//

/**
 * The meter itself lives in `react-ui-components` and reads `Progress.TaskProgress` directly, so a
 * registry monitor goes straight to it with nothing in between. Re-exported here because this is the
 * import path every consumer already uses.
 */
export { ProgressMeter, type ProgressMeterProps, formatDuration } from '@dxos/react-ui-components';
