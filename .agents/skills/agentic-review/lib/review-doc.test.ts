//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type IssuedDiagnostic, parseDiagnostics } from './diagnostics.ts';
import {
  legacySystemOneAppendix,
  readIndexEntries,
  renderReviewBody,
  splitReviewBody,
  writeAppendix,
} from './review-doc.ts';

const diagnostics: IssuedDiagnostic[] = [
  { severity: 'error', id: 'abc-1', ruleId: 'no-casts', file: 'src/a.ts', line: 3, col: null, body: 'Cast.' },
  { severity: 'warn', id: 'abc-2', ruleId: 'comment-hygiene', file: 'src/b.ts', line: 9, col: 2, body: 'Comment.' },
];

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'review-doc-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('renderReviewBody / splitReviewBody', () => {
  test('round-trips index, issues and appendix', () => {
    const body = renderReviewBody({
      diagnostics,
      statuses: new Map([['abc-1', 'resolved']]),
      appendix: '### System One pass\n\n- model: jev',
    });
    const sections = splitReviewBody(body);
    expect(sections.preamble).toBe('_1 error(s), 1 warning(s)._');
    expect(readIndexEntries(dir, body).map(({ id, status }) => `${id} ${status}`)).toEqual([
      'abc-1 resolved',
      'abc-2 unresolved',
    ]);
    expect(parseDiagnostics(sections.issues).map(({ id, body }) => `${id} ${body}`)).toEqual([
      'abc-1 Cast.',
      'abc-2 Comment.',
    ]);
    expect(sections.appendix).toBe('### System One pass\n\n- model: jev');
  });

  test('a clean run has an empty index and no issues section', () => {
    const body = renderReviewBody({ diagnostics: [], statuses: null, appendix: '' });
    expect(body).not.toContain('## Issues');
    expect(body).not.toContain('## Appendix');
    expect(readIndexEntries(dir, body)).toEqual([]);
  });

  test('a pre-index body is all issues and falls back to RESOLUTION.md', () => {
    const body = '_1 error(s), 0 warning(s)._\n\n# ERROR abc-1 no-casts `src/a.ts:3`\n\nCast.\n';
    writeFileSync(join(dir, 'RESOLUTION.md'), '# Resolution — abc\n\n- abc-1 - ignored - no-casts - src/a.ts:3\n');
    expect(splitReviewBody(body).index).toBeNull();
    expect(parseDiagnostics(splitReviewBody(body).issues)).toHaveLength(1);
    expect(readIndexEntries(dir, body).map(({ status }) => status)).toEqual(['ignored']);
  });
});

describe('writeAppendix', () => {
  test('replaces only the appendix', () => {
    const path = join(dir, 'REVIEW.md');
    writeFileSync(path, '---\ncommit: abc\n---\n\n<!-- stub -->\n\n## Appendix\n\nold\n');
    writeAppendix(path, 'new');
    expect(readFileSync(path, 'utf8')).toBe('---\ncommit: abc\n---\n\n<!-- stub -->\n\n## Appendix\n\nnew\n');
  });
});

describe('legacySystemOneAppendix', () => {
  test('keeps the run metadata and drops the follow-up list', () => {
    const text =
      '# System One pass — .agents/reviews/abc\n\n- model: jev\n\n## Still needs an agentic reviewer\n\n- `x`\n';
    expect(legacySystemOneAppendix(text)).toBe('### System One pass\n\n- model: jev');
  });
});
