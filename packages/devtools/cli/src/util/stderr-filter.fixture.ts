//
// Copyright 2026 DXOS.org
//

/**
 * Subprocess fixture for `stderr-filter.subprocess.test.ts`. Installs the
 * production stderr filter and then writes a known mix of warning + real
 * lines to stderr via the SAME APIs that warnAfterTimeout uses (i.e.
 * `console.warn` and a multi-line single-shot template, NOT a series of
 * `process.stderr.write` calls).
 *
 * This is critical: in Bun, `console.warn` writes to fd 2 directly without
 * going through `process.stderr.write`, so a filter that only wraps
 * `process.stderr.write` would falsely appear to work in tests but fail in
 * the real CLI. This fixture matches the production code path so the test
 * is a real regression guard.
 */

import { installStderrFilter } from './stderr-filter';

installStderrFilter();

// console.warn before any warning — must pass through.
console.warn('REAL warn before warning');

// Mirror warnAfterTimeout's actual call: a single console.warn whose
// argument is a multi-line string (message + stack).
console.warn(
  [
    'Action `Finding properties for a space` is taking more then 5,000ms to complete. This might be a bug.',
    '    at <anonymous> (/abs/path.mjs:1:1)',
    '    at warnAfterTimeout (/abs/path.mjs:2:2)',
    '    at processTicksAndRejections (native)',
  ].join('\n'),
);

// console.error after warning — must pass through.
console.error('REAL error after warning');

// Defence-in-depth: also exercise the process.stderr.write path. Real lines
// must pass; a warning emitted that way must still be filtered.
process.stderr.write('REAL line via process.stderr.write\n');
process.stderr.write('Action `another action` is taking more than 10,000ms to complete. This might be a bug.\n');
process.stderr.write('    at frame (/abs/path.mjs:3:3)\n');
process.stderr.write('REAL final line via process.stderr.write\n');
