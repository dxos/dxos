//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'vite';

import { type EdgeConfig, resolveEdgeUrl } from '../util/edge-url.ts';
import { PUBLICATIONS_PATH, edgePublicationUrl } from '../util/publication-paths.ts';

const definedConfig = (define: Record<string, any> | undefined, key: string): EdgeConfig | undefined => {
  const value = define?.[key];
  return typeof value === 'string' ? JSON.parse(value) : undefined;
};

export const viewerRoutePlugin = (): Plugin => ({
  name: 'composer:viewer-route',
  apply: 'serve',
  configureServer: (server) => {
    const { define } = server.config;
    const edgeUrl = resolveEdgeUrl(
      definedConfig(define, '__CONFIG_ENVS__'),
      definedConfig(define, '__CONFIG_LOCAL__'),
      definedConfig(define, '__CONFIG_DEFAULTS__'),
    );
    server.middlewares.use((req, res, next) => {
      const host = req.headers.host ?? '';
      const pathname = (req.url ?? '/').split('?')[0];
      if (!host.startsWith('view.')) {
        next();
        return;
      }

      if (pathname.startsWith(`${PUBLICATIONS_PATH}/`) && edgeUrl) {
        void proxyPublication(edgePublicationUrl(pathname, edgeUrl), req.method ?? 'GET').then(
          ({ status, headers, body }) => {
            res.writeHead(status, headers);
            res.end(body);
          },
          (error) => next(error),
        );
        return;
      }

      const isNavigation =
        req.headers['sec-fetch-mode'] === 'navigate' ||
        (req.headers.accept?.includes('text/html') && !pathname.includes('.'));
      if (isNavigation && pathname !== '/viewer.html') {
        req.url = '/viewer.html';
      }
      next();
    });
  },
});

const proxyPublication = async (url: URL, method: string) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
  if (method === 'OPTIONS') {
    return { status: 204, headers, body: undefined };
  }
  const upstream = await fetch(url, { method });
  return {
    status: upstream.status,
    headers: { ...headers, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    body: Buffer.from(await upstream.arrayBuffer()),
  };
};
