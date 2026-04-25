//
// Copyright 2026 DXOS.org
//

/**
 * Subprocess fixture for `stderr-filter.subprocess.test.ts`. Installs the
 * production stderr filter and then writes a known mix of warning + real
 * lines to stderr in the same process. The test runner spawns this script
 * with bun and asserts that captured stderr contains the real lines but
 * not the warnings — proving the filter is wired up correctly inside a
 * real Node-style `process.stderr.write` flow.
 */

import { installStderrFilter } from './stderr-filter';

installStderrFilter();

process.stderr.write('REAL line before warning\n');
process.stderr.write(
  'Action `Finding properties for a space` is taking more then 5,000ms to complete. This might be a bug.\n',
);
process.stderr.write('    at <anonymous> (/abs/path.mjs:1:1)\n');
process.stderr.write('    at warnAfterTimeout (/abs/path.mjs:2:2)\n');
process.stderr.write('    at processTicksAndRejections (native)\n');
process.stderr.write('REAL line after warning\n');
process.stderr.write('Action `another action` is taking more than 10,000ms — should also drop\n');
process.stderr.write('    at frame (/abs/path.mjs:3:3)\n');
process.stderr.write('REAL final line\n');
