//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import type * as PublicationManifest from '@dxos/plugin-space/PublicationManifest';

import handler from './_worker.ts';
import { PNG_SIGNATURE, pngSize } from './preview-image/testing.ts';

// Vitest cannot import `.wasm` as a module the way the Worker's bundle does.
vi.mock('./preview-image/worker-assets.ts', async () => {
  const { loadRenderAssets } = await import('./preview-image/testing.ts');
  return { assets: await loadRenderAssets() };
});

vi.stubGlobal('__CONFIG_DEFAULTS__', { runtime: { services: { edge: { url: 'https://edge.test' } } } });

const INDEX_HTML = '<!doctype html><html><head><title>Composer</title></head><body></body></html>';
const VIEWER_HTML = '<!doctype html><html><head><title>Viewer</title></head><body></body></html>';
const ARCHIVED_CHUNK = 'assets/async-OLDHASH0.js';

const PAGES: Record<string, string> = { '/': INDEX_HTML, '/viewer': VIEWER_HTML };

/**
 * The asset server as the Worker sees it: the two HTML entries at their pretty paths, a redirect to them
 * from the `.html` path (`html_handling: auto-trailing-slash`), and a 404 for everything it misses.
 */
const assets = {
  fetch: async (request: Request) => {
    const { pathname } = new URL(request.url);
    if (pathname.endsWith('.html')) {
      return Response.redirect(new URL(pathname.slice(0, -'.html'.length), request.url).toString(), 307);
    }
    const page = PAGES[pathname];
    return page
      ? new Response(page, { headers: { 'Content-Type': 'text/html' } })
      : new Response('Not Found', { status: 404 });
  },
};

/** A retention bucket holding one chunk a previous build shipped. */
const archive = {
  get: async (key: string) =>
    key === ARCHIVED_CHUNK
      ? {
          body: 'export {};',
          httpEtag: '"archived"',
          writeHttpMetadata: (headers: Headers) => headers.set('Content-Type', 'text/javascript'),
        }
      : null,
};

const fetch = handler.fetch!;
const env = {
  ASSETS: assets,
  ASSET_ARCHIVE: archive,
  APPLE_TEAM_ID: 'TEAM',
} as unknown as Parameters<typeof fetch>[1];

const get = (path: string, secFetchMode?: string, host = 'composer.test') =>
  fetch(
    new Request(`https://${host}${path}`, { headers: secFetchMode ? { 'Sec-Fetch-Mode': secFetchMode } : {} }),
    env,
    {} as never,
  );

describe('asset misses', () => {
  test('a navigation to a client-side route gets index.html', async () => {
    const response = await get('/space/v1.2/doc', 'navigate');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  test('a chunk a previous build shipped comes from the archive', async () => {
    const response = await get(`/${ARCHIVED_CHUNK}`, 'cors');
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Asset-Source')).toBe('archive');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
  });

  test('a chunk in neither the build nor the archive is a 404 no cache keeps', async () => {
    const response = await get('/assets/async-GONE0000.js', 'cors');
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('viewer host', () => {
  test('a navigation on a view. host gets viewer.html', async () => {
    const response = await get('/pub-1/db/org.dxos.type.document+01ABC', 'navigate', 'view.composer.test');
    expect(await response.text()).toBe(VIEWER_HTML);
  });

  test('the same navigation on the app host gets index.html', async () => {
    const response = await get('/pub-1/db/org.dxos.type.document+01ABC', 'navigate');
    expect(await response.text()).toBe(INDEX_HTML);
  });
});

describe('publications on the viewer host', () => {
  const VIEWER = 'view.composer.test';
  const ROADMAP_ID = '01M7NGN322DR48YA6R9Q4648KR';
  const MANIFEST = {
    version: 1,
    name: 'Field notes',
    publishedAt: '2026-11-16T00:00:00Z',
    plugins: [],
    objects: [ROADMAP_ID],
    preview: {
      description: 'Release notes and the roadmap.',
      types: [{ typename: 'org.dxos.type.document', label: 'Document', count: 1 }],
      objects: { [ROADMAP_ID]: { title: 'Q4 roadmap', type: 'Document', description: 'We ship publishing first.' } },
    },
  } satisfies PublicationManifest.Manifest;
  const SPACE_IMAGE = 'https://view.composer.test/publications/abc_123/preview.png';

  const edge = (publicId = 'abc_123') => {
    const requested: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      requested.push(url.toString());
      if (url.pathname === `/db/publications/${publicId}/manifest.json`) {
        return Response.json(MANIFEST);
      }
      if (url.pathname === `/db/publications/${publicId}/archive.json`) {
        return Response.json({ objects: [] });
      }
      return new Response('Not found', { status: 404 });
    });
    return requested;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a public file is read from EDGE and open to any origin', async () => {
    const requested = edge();
    const response = await get('/publications/abc_123/archive.json', 'cors', VIEWER);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.json()).toEqual({ objects: [] });
    expect(requested).toEqual(['https://edge.test/db/publications/abc_123/archive.json']);
  });

  test('anything but the archive or manifest of a well-formed id never reaches EDGE', async () => {
    const requested = edge();
    expect((await get('/publications/abc_123/record.json', 'cors', VIEWER)).status).toBe(404);
    expect((await get('/publications/..%2Fspaces/archive.json', 'cors', VIEWER)).status).toBe(404);
    expect(requested).toEqual([]);
  });

  test('a crawler reading a space link sees the space, described and drawn', async () => {
    edge();
    const html = await (await get('/abc_123', undefined, VIEWER)).text();
    expect(html).toContain('<title>Field notes | Composer</title>');
    expect(html).toContain('<meta property="og:description" content="Release notes and the roadmap." />');
    expect(html).toContain(`<meta property="og:image" content="${SPACE_IMAGE}" />`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  test('a crawler reading an object link sees the object the manifest describes', async () => {
    edge();
    const html = await (
      await get(`/w/SPACE/db/org.dxos.type.document+${ROADMAP_ID}?p=abc_123`, 'navigate', VIEWER)
    ).text();
    expect(html).toContain('<meta property="og:title" content="Q4 roadmap" />');
    expect(html).toContain('<meta property="og:description" content="We ship publishing first." />');
    expect(html).toContain(`<meta property="og:image" content="${SPACE_IMAGE}?object=${ROADMAP_ID}" />`);
  });

  test('a crawler reading an object link sees the object, whichever key the link names it by', async () => {
    edge();
    for (const path of [
      `/abc_123/object/${ROADMAP_ID}`,
      `/w/SPACE/object/${ROADMAP_ID}/companion/comments?p=abc_123`,
      `/abc_123/sketch/${ROADMAP_ID}`,
    ]) {
      const html = await (await get(path, undefined, VIEWER)).text();
      expect(html).toContain('<meta property="og:title" content="Q4 roadmap" />');
      expect(html).toContain(`<meta property="og:image" content="${SPACE_IMAGE}?object=${ROADMAP_ID}" />`);
    }
  });

  test('an object the manifest does not describe is named by its link, from the space', async () => {
    edge();
    const html = await (
      await get(
        '/w/SPACE/db/org.dxos.type.document+01M7NGN322DR48YA6R9Q4648KS?p=abc_123&title=Plan',
        'navigate',
        VIEWER,
      )
    ).text();
    expect(html).toContain('<meta property="og:title" content="Plan" />');
    expect(html).toContain('<meta property="og:description" content="From Field notes, published from Composer." />');
    expect(html).toContain(`<meta property="og:image" content="${SPACE_IMAGE}" />`);
  });

  test('the preview image is a PNG card, of the object when one is named', async () => {
    edge();
    const space = await get('/publications/abc_123/preview.png', 'no-cors', VIEWER);
    const object = await get(`/publications/abc_123/preview.png?object=${ROADMAP_ID}`, 'no-cors', VIEWER);
    for (const response of [space, object]) {
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
    }
    const [spacePng, objectPng] = await Promise.all(
      [space, object].map(async (response) => new Uint8Array(await response.arrayBuffer())),
    );
    expect([...spacePng.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(pngSize(objectPng)).toEqual({ width: 1200, height: 630 });
    expect(objectPng).not.toEqual(spacePng);
  });

  test('a publication EDGE does not have has no preview image', async () => {
    edge('other');
    expect((await get('/publications/abc_123/preview.png', 'no-cors', VIEWER)).status).toBe(404);
  });

  test('a link to a publication EDGE does not have gets the viewer untouched', async () => {
    edge('other');
    expect(await (await get('/abc_123', 'navigate', VIEWER)).text()).toBe(VIEWER_HTML);
  });
});

describe('link previews', () => {
  test('a route carrying a title names the page after it', async () => {
    const response = await get(`/w/space/doc/1?title=${encodeURIComponent('Plan <Q3> & "more"')}`, 'navigate');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Plan &lt;Q3&gt; &amp; &quot;more&quot; | Composer</title>');
    expect(html).toContain('<meta property="og:title" content="Plan &lt;Q3&gt; &amp; &quot;more&quot;" />');
  });

  test('a crawler without Sec-Fetch-Mode gets the preview too', async () => {
    const response = await get('/w/space/doc/1?title=Plan');
    expect(await response.text()).toContain('<meta property="og:title" content="Plan" />');
  });

  test('a route without a title gets index.html untouched', async () => {
    const response = await get('/w/space/doc/1?title=%20', 'navigate');
    expect(await response.text()).toBe(INDEX_HTML);
  });
});

describe('feedback logs', () => {
  const upload = async (body: string, contentType: string, query = '') => {
    const puts: { key: string; contentType?: string }[] = [];
    const bucket = {
      put: async (key: string, _body: ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => {
        puts.push({ key, contentType: options?.httpMetadata?.contentType });
      },
    };
    const response = await fetch(
      new Request(`https://composer.test/api/feedback-logs${query}`, {
        method: 'POST',
        headers: {
          'Origin': 'https://composer.test',
          'Content-Type': contentType,
          'Content-Length': String(new TextEncoder().encode(body).byteLength),
        },
        body,
      }),
      { ...env, FEEDBACK_LOGS: bucket } as unknown as Parameters<typeof fetch>[1],
      {} as never,
    );
    return { response, puts };
  };

  test('a gzipped upload is stored as .ndjson.gz', async () => {
    const { response, puts } = await upload('gz', 'application/gzip');
    expect(response.status).toBe(200);
    const { key } = await response.json();
    expect(key).toMatch(/^logs\/\d{4}-\d{2}-\d{2}\/[\w-]+\.ndjson\.gz$/);
    expect(puts).toEqual([{ key, contentType: 'application/gzip' }]);
  });

  test('a plain NDJSON upload from an older client is stored as .ndjson', async () => {
    const { response, puts } = await upload('{}\n', 'application/x-ndjson');
    expect(response.status).toBe(200);
    const { key } = await response.json();
    expect(key).toMatch(/\.ndjson$/);
    expect(puts).toEqual([{ key, contentType: 'application/x-ndjson' }]);
  });

  test('a trajectory upload is filed under trajectories/', async () => {
    const { response } = await upload('gz', 'application/gzip', '?kind=trajectory');
    expect(response.status).toBe(200);
    const { key } = await response.json();
    expect(key).toMatch(/^trajectories\/\d{4}-\d{2}-\d{2}\/[\w-]+\.ndjson\.gz$/);
  });

  test('an unknown kind cannot pick its own prefix', async () => {
    for (const kind of ['../secrets', 'constructor']) {
      const { response } = await upload('gz', 'application/gzip', `?kind=${kind}`);
      const { key } = await response.json();
      expect(key).toMatch(/^logs\//);
    }
  });
});

describe('apple-app-site-association', () => {
  // DX-1324: a channel signed under its own App ID gets passkeys only when the domain names it.
  test('passkeys are shared with the prerelease channels, universal links are not', async () => {
    const response = await get('/.well-known/apple-app-site-association');
    const document = await response.json();
    expect(document.webcredentials.apps).toEqual([
      'TEAM.org.dxos.composer',
      'TEAM.org.dxos.composer.dev',
      'TEAM.org.dxos.composer.preview',
    ]);
    expect(document.applinks.details[0].appIDs).toEqual(['TEAM.org.dxos.composer']);
  });
});
