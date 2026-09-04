//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ir from './Ir';
import { webApp } from './testing';
import * as Validate from './Validate';

describe('validate', () => {
  test('upstream’s own reference document passes', ({ expect }) => {
    const { ok, diagnostics } = Validate.validate(webApp);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(ok).toBe(true);
  });

  test('a malformed document reports the field, not a stack trace', ({ expect }) => {
    const { ok, diagnostics } = Validate.validate({
      schema_version: 1,
      diagram_type: 'architecture',
      meta: {},
      components: [],
    });
    expect(ok).toBe(false);
    expect(diagnostics.every((diagnostic) => diagnostic.code === 'schema/invalid')).toBe(true);
    expect(diagnostics.some((diagnostic) => diagnostic.subject.path === 'meta.title')).toBe(true);
  });

  test('an unplaced component blocks, and suppresses the geometric rules', ({ expect }) => {
    const result = Validate.validate(
      minimal({ components: [{ id: 'a', type: 'backend', label: 'a' }], connections: [] }),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['layout/unplaced']);
    expect(result.diagnostics[0].supportedFixes).toContain('components[].pos');
  });

  test('grid collisions and overflow are caught before anything is drawn', ({ expect }) => {
    expect(
      codes(
        minimal({
          layout: { mode: 'grid', cols: 2 },
          components: [
            { id: 'a', type: 'backend', label: 'a', row: 0, col: 0 },
            { id: 'b', type: 'backend', label: 'b', row: 0, col: 0 },
            { id: 'c', type: 'backend', label: 'c', row: 0, col: 5 },
          ],
          connections: [],
        }),
      ),
    ).toEqual(expect.arrayContaining(['layout/grid-collision', 'layout/grid-overflow']));
  });

  test('a connection to a component that does not exist is named with both ends', ({ expect }) => {
    const [diagnostic] = Validate.validate(minimal({ connections: [{ id: 'x', from: 'a', to: 'ghost' }] })).diagnostics;
    expect(diagnostic.code).toBe('connection/unknown-endpoint');
    expect(diagnostic.subject).toMatchObject({ connection: 'x', end: 'to' });
  });

  test('overlapping components fail', ({ expect }) => {
    expect(
      codes(
        minimal({
          components: [
            { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
            { id: 'b', type: 'backend', label: 'b', pos: [50, 20], size: [100, 50] },
          ],
        }),
      ),
    ).toContain('layout/component-overlap');
  });

  test('components closer than the minimum gap fail even when they do not intersect', ({ expect }) => {
    expect(
      codes(
        minimal({
          components: [
            { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
            { id: 'b', type: 'backend', label: 'b', pos: [110, 0], size: [100, 50] },
          ],
        }),
      ),
    ).toContain('layout/component-overlap');
  });

  test('a label sitting over the lower half of a component is still caught', ({ expect }) => {
    const [diagnostic] = Validate.validate(
      minimal({
        components: [
          { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
          { id: 'b', type: 'backend', label: 'b', pos: [400, 0], size: [100, 50] },
          { id: 'under', type: 'external', label: 'under', pos: [200, 200], size: [120, 60] },
        ],
        // Pinned so the label's lower edge, not its baseline, is what covers "under".
        connections: [{ id: 'edge', from: 'a', to: 'b', label: 'covered', labelAt: [260, 198] }],
      }),
    ).diagnostics;

    expect(diagnostic.code).toBe('label/clearance');
    expect(diagnostic.subject).toMatchObject({ component: 'under' });
  });

  test('a route through a third component is a repairable error', ({ expect }) => {
    const [diagnostic] = Validate.validate(
      minimal({
        components: [
          { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
          { id: 'blocker', type: 'backend', label: 'blocker', pos: [200, 0], size: [100, 50] },
          { id: 'b', type: 'backend', label: 'b', pos: [400, 0], size: [100, 50] },
        ],
        connections: [{ id: 'through', from: 'a', to: 'b', fromSide: 'right', toSide: 'left' }],
      }),
    ).diagnostics;

    expect(diagnostic.code).toBe('route/crosses-component');
    expect(diagnostic.subject).toMatchObject({ connection: 'through', component: 'blocker' });
    expect(diagnostic.supportedFixes).toContain('connections[].via');
  });

  test('a disconnected component warns without blocking the write', ({ expect }) => {
    const result = Validate.validate(
      minimal({
        components: [
          { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
          { id: 'b', type: 'backend', label: 'b', pos: [400, 0], size: [100, 50] },
          { id: 'lonely', type: 'external', label: 'lonely', pos: [0, 400], size: [100, 50] },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('graph/orphan');
  });

  test('the decoded document is returned so callers store what was checked', ({ expect }) => {
    const { document } = Validate.validate({ ...webApp, meta: { ...webApp.meta, output: 'ignored.html' } });
    expect(document?.meta).not.toHaveProperty('output');
  });
});

const codes = (source: unknown) => Validate.validate(source).diagnostics.map((diagnostic) => diagnostic.code);

const minimal = (rest: Partial<Ir.Architecture> = {}): Ir.Architecture => ({
  schema_version: 1,
  diagram_type: 'architecture',
  meta: { title: 'test' },
  components: [
    { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
    { id: 'b', type: 'backend', label: 'b', pos: [400, 0], size: [100, 50] },
  ],
  connections: [{ from: 'a', to: 'b' }],
  ...rest,
});
