//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { encodeExecCommand } from './exec-command.ts';

describe('encodeExecCommand', () => {
  test('a single-line command is sent as it is', () => {
    expect(encodeExecCommand('echo hello && ls -la')).toBe('echo hello && ls -la');
  });

  // The service flattens newlines, so the multi-line form must not contain any once encoded.
  test('a multi-line command travels as one base64 line that decodes to the original', () => {
    const script = "cat > index.ts <<'EOF'\nexport default {};\nEOF\nwc -l index.ts";
    const sent = encodeExecCommand(script, 'abc');
    expect(sent).not.toContain('\n');
    const encoded = sent.match(/printf '%s' '([A-Za-z0-9+/=]+)'/)?.[1];
    expect(encoded && Buffer.from(encoded, 'base64').toString('utf8')).toBe(script);
    expect(sent).toMatch(/\| base64 -d > \/tmp\/\.dx-exec-abc\.sh && bash \/tmp\/\.dx-exec-abc\.sh$/);
  });

  test('each multi-line command writes a script of its own', () => {
    const script = 'echo one\necho two';
    const scriptPath = (sent: string) => sent.match(/> (\S+) &&/)?.[1];
    expect(scriptPath(encodeExecCommand(script))).not.toBe(scriptPath(encodeExecCommand(script)));
  });
});
