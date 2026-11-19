//
// Copyright 2026 DXOS.org
//

import * as OtelProxy from '@dxos/observability/OtelProxy';

import { type ShareEnv, handleShare, isSharePath } from './share.ts';
import { SITE_DIR, isSitePath } from './site.ts';

export type Env = ShareEnv & {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  POSTHOG_OTLP_URL?: string;
  POSTHOG_PROJECT_TOKEN?: string;
  /** Comma-separated hosts that serve the site (spec F-13.3); unset where the environment has none. */
  LANDING_HOSTS?: string;
};

/** Query parameters only the app reads, so `/` with one of them is a link into the app, not to the site. */
const APP_PARAMS = ['spaceInvitationCode', 'd', 'src'];

const OTEL_MAX_BODY_SIZE = 64 * 1024 * 1024;

const isLandingHost = (hostname: string, env: Env) =>
  !!env.LANDING_HOSTS &&
  env.LANDING_HOSTS.split(',')
    .map((host) => host.trim())
    .includes(hostname);

/**
 * A site page or file, from the site's folder of the assets. A redirect the assets answer, such as `/docs` to
 * `/docs/`, names the folder, so its location drops it. A page the site does not have gets the site's 404 page,
 * where the assets would answer with the app's `index.html`.
 */
const serveSite = async (request: Request, url: URL, env: Env): Promise<Response> => {
  const response = await env.ASSETS.fetch(
    new Request(new URL(`${SITE_DIR}${url.pathname}${url.search}`, url), request),
  );
  const location = response.headers.get('Location');
  if (location) {
    const target = new URL(location, url);
    if (!target.pathname.startsWith(`${SITE_DIR}/`)) {
      return response;
    }
    const headers = new Headers(response.headers);
    headers.set('Location', `${target.pathname.slice(SITE_DIR.length)}${target.search}`);
    return new Response(response.body, { status: response.status, headers });
  }
  if (response.ok && (await isAppShell(response, url, env))) {
    const notFound = await env.ASSETS.fetch(new Request(new URL(`${SITE_DIR}/404.html`, url)));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }
  return response;
};

/** Whether the assets answered with the app's `index.html`, their fallback for a path they do not hold. */
const isAppShell = async (response: Response, url: URL, env: Env): Promise<boolean> => {
  const etag = response.headers.get('ETag');
  if (!etag || !response.headers.get('Content-Type')?.startsWith('text/html')) {
    return false;
  }
  const shell = await env.ASSETS.fetch(new Request(new URL('/', url), { method: 'HEAD' }));
  return shell.headers.get('ETag') === etag;
};

/** On a landing host: the site's pages and files are the site's, and every other address belongs to the app host. */
const serveLanding = (request: Request, url: URL, env: Env): Promise<Response> | undefined => {
  const appLink = url.pathname === '/' && APP_PARAMS.some((param) => url.searchParams.has(param));
  if (!appLink && isSitePath(url.pathname)) {
    return serveSite(request, url, env);
  }
  if (!env.APP_ORIGIN) {
    return undefined;
  }
  return Promise.resolve(Response.redirect(`${env.APP_ORIGIN}${url.pathname}${url.search}`, 302));
};

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const otel = OtelProxy.handle(request, {
      url: env.POSTHOG_OTLP_URL,
      token: env.POSTHOG_PROJECT_TOKEN,
      maxBodySize: OTEL_MAX_BODY_SIZE,
    });
    if (otel) {
      return otel;
    }

    const url = new URL(request.url);
    if (isSharePath(url.pathname)) {
      return handleShare(request, env);
    }
    if (!url.pathname.startsWith('/api/') && isLandingHost(url.hostname, env)) {
      const landing = serveLanding(request, url, env);
      if (landing) {
        return landing;
      }
    }
    return env.ASSETS.fetch(request);
  },
};
