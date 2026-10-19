//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { createServer } from 'node:http';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { diagramName, diagramSource, openerCommand, share } from './open.ts';
import { render } from './render.ts';

const SOURCE = 'node A\nnode B right-of A\nedge A -> B\n';

describe('open', () => {
  test('reads the source of a .dx and of a .dx.svg, and refuses a plain SVG', async ({ expect }) => {
    const { svg } = await render(SOURCE, { name: 'arch' });
    const { svg: plain } = await render(SOURCE, { name: 'arch', plain: true });
    expect(await EffectEx.runPromise(diagramSource('arch.dx', SOURCE))).toBe(SOURCE);
    expect(await EffectEx.runPromise(diagramSource('arch.dx.svg', svg))).toBe(SOURCE);
    expect(Exit.isFailure(await Effect.runPromiseExit(diagramSource('arch.svg', plain)))).toBe(true);
    expect(diagramName('out/whatever.dx.svg', svg)).toBe('arch');
    expect(diagramName('docs/flow.dx', SOURCE)).toBe('flow');
    expect(diagramName('-', SOURCE)).toBe('diagram');
  });

  test('picks the platform opener, and none on a Linux without a display', ({ expect }) => {
    const url = 'https://app.drawing.sh/?d=abc';
    expect(openerCommand(url, 'darwin', {})).toEqual(['open', [url]]);
    expect(openerCommand(url, 'linux', { DISPLAY: ':0' })).toEqual(['xdg-open', [url]]);
    expect(openerCommand(url, 'linux', {})).toBeUndefined();
    expect(openerCommand(url, 'win32', {})?.[0]).toBe('cmd');
  });

  test('posts the source to the share API and returns its link', async ({ expect }) => {
    const requests: { url?: string; body: string }[] = [];
    const server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => {
        requests.push({ url: request.url, body });
        if (body.length > 100) {
          response.writeHead(413).end('too large');
          return;
        }
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ id: 'abc', url: 'http://app.test/?d=abc' }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (typeof address !== 'object' || address === null) {
        throw new Error('server has no port');
      }
      const appUrl = `http://127.0.0.1:${address.port}`;
      const result = await EffectEx.runPromise(share(SOURCE, { name: 'arch', appUrl }));
      expect(result).toEqual({ id: 'abc', url: `${appUrl}/?d=abc` });
      expect(requests[0]).toEqual({ url: '/api/share?name=arch', body: SOURCE });

      const refused = await Effect.runPromiseExit(share('x'.repeat(200), { name: 'big', appUrl }));
      expect(Exit.isFailure(refused)).toBe(true);
    } finally {
      server.close();
    }
  });
});
