//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DxSvg } from '@dxos/diagram';

import { render, source } from './render.ts';

const SOURCE = `
group web "Web app" {
  node Browser
  node Api "API server"
}
node Db "Postgres"
edge Browser -> Api "HTTPS"
edge Api -> Db "reads, writes"
`;

describe('render', () => {
  test('lays out a diagram and embeds its source', async ({ expect }) => {
    const { svg, report } = await render(SOURCE, { name: 'arch' });
    expect(report.failed).toBe(false);
    expect(report.crossings).toBe(0);
    expect(report.connectors).toBe(2);
    expect(svg).toContain('API server');
    expect(DxSvg.extract(svg)).toMatchObject({ name: 'arch', source: { language: 'dsl', text: SOURCE } });
  });

  test('a plain render carries no payload', async ({ expect }) => {
    const { svg } = await render(SOURCE, { name: 'arch', plain: true });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(DxSvg.isDxSvg(svg)).toBe(false);
  });

  test('a source error fails the render and writes nothing', async ({ expect }) => {
    const { svg, report } = await render('edge A -> Missing\n', { name: 'bad' });
    expect(report.failed).toBe(true);
    expect(svg).toBe('');
    expect(report.notes.some(({ severity }) => severity === 'error')).toBe(true);
  });

  test('the source comes back out of the .dx.svg exactly', async ({ expect }) => {
    const { svg } = await render(SOURCE, { name: 'arch' });
    expect(source(svg)).toBe(SOURCE);
    const { svg: plain } = await render(SOURCE, { name: 'arch', plain: true });
    expect(source(plain)).toBeUndefined();
  });
});
