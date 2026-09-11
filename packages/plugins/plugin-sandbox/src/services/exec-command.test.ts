//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { encodeExecCommand } from './exec-command';

describe('encodeExecCommand', () => {
  test('a single-line command is sent as it is', () => {
    expect(encodeExecCommand('echo hello && ls -la')).toBe('echo hello && ls -la');
  });

  // The service flattens newlines, so the multi-line form must not contain any once encoded.
  test('a multi-line command travels as one base64 line that decodes to the original', () => {
    const script = "cat > index.ts <<'EOF'\nexport default {};\nEOF\nwc -l index.ts";
    const sent = encodeExecCommand(script);
    expect(sent).not.toContain('\n');
    const encoded = sent.match(/printf '%s' '([A-Za-z0-9+/=]+)'/)?.[1];
    expect(encoded && Buffer.from(encoded, 'base64').toString('utf8')).toBe(script);
    expect(sent).toMatch(/\| base64 -d > \/tmp\/\.dx-exec\.sh && bash \/tmp\/\.dx-exec\.sh$/);
  });
});
