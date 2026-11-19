//
// Copyright 2026 DXOS.org
//

import * as OtelProxy from '@dxos/observability/OtelProxy';

import { type ShareEnv, handleShare, isSharePath } from './share.ts';

export type Env = ShareEnv & {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  POSTHOG_OTLP_URL?: string;
  POSTHOG_PROJECT_TOKEN?: string;
  /** Comma-separated hosts that serve the landing page (spec F-13.3); unset where the environment has none. */
  LANDING_HOSTS?: string;
};

/**
 * The landing page's address in the assets. Not `/landing.html`: the assets' default HTML handling redirects that
 * to this.
 */
export const LANDING_PATH = '/landing';

/** Query parameters only the app reads, so `/` with one of them is a link into the app, not to the landing page. */
const APP_PARAMS = ['spaceInvitationCode', 'd', 'src'];

const OTEL_MAX_BODY_SIZE = 64 * 1024 * 1024;

const isLandingHost = (hostname: string, env: Env) =>
  !!env.LANDING_HOSTS &&
  env.LANDING_HOSTS.split(',')
    .map((host) => host.trim())
    .includes(hostname);

/** A file the landing page loads, such as its script or the hero `.dx.svg`, as against a page address. */
const isFile = (pathname: string) => /\.[^/]+$/.test(pathname);

/** On a landing host: `/` is the landing page, files are assets, and every other address belongs to the app host. */
const serveLanding = (request: Request, url: URL, env: Env): Promise<Response> | undefined => {
  if (url.pathname === '/' && !APP_PARAMS.some((param) => url.searchParams.has(param))) {
    return env.ASSETS.fetch(new Request(new URL(LANDING_PATH, url), request));
  }
  if (isFile(url.pathname) || !env.APP_ORIGIN) {
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
