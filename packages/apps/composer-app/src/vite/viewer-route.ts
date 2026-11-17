//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'vite';

import { type EdgeConfig, resolveEdgeUrl } from '../util/edge-url.ts';

/** A config `ConfigPlugin` defined for the page, as the JSON it put in `define`. */
const definedConfig = (define: Record<string, any> | undefined, key: string): EdgeConfig | undefined => {
  const value = define?.[key];
  return typeof value === 'string' ? JSON.parse(value) : undefined;
};

/**
 * Dev twin of the Worker's viewer routing on a `view.` host (`view.localhost` locally): a page
 * navigation gets `viewer.html` instead of the Composer SPA, and `/publications/*` reads go to EDGE,
 * so the viewer and a fork read publications from the viewer origin as they do when deployed.
 */
export const viewerRoutePlugin = (): Plugin => ({
  name: 'composer:viewer-route',
  apply: 'serve',
  configureServer: (server) => {
    // The EDGE the page is served against, from the config `ConfigPlugin` resolved for it.
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

      if (pathname.startsWith('/publications/') && edgeUrl) {
        // EDGE serves publications from db-service, under `/db`.
        void proxyPublication(new URL(`/db${pathname}`, edgeUrl), req.method ?? 'GET').then(
          ({ status, headers, body }) => {
            res.writeHead(status, headers);
            res.end(body);
          },
          (error) => next(error),
        );
        return;
      }

      // Object paths carry dots (`db/<typename>+…`), so a navigation is a route whatever it names.
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
