//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';

import { log } from '@dxos/log';

import chess from './chess';
import { type Env } from './defs';
import testing from './testing';
import { safeJson } from './util';

export * from './signaling';

/**
 * https://hono.dev/top
 * https://hono.dev/getting-started/cloudflare-workers
 * https://developers.cloudflare.com/workers/runtime-apis/request
 */
const root = new Hono<Env>();

// TODO(burdon): Integrate baselime.
root.use(
  logger((msg, ...params) => {
    log.info(msg, params.length ? { params } : undefined);
  }),
);
root.use(
  timing({
    // TODO(burdon): Filter certain events.
    enabled: () => true,
  }),
);
root.use(prettyJSON({ space: 2 }));

/**
 * Custom middleware.
 * https://hono.dev/concepts/middleware
 */
root.use(async (c, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  c.res.headers.set('X-Response-Time', `${end - start}`);
});

/**
 * Custom request logging.
 */
root.use(async (c, next) => {
  const data = await safeJson(c.req);
  // TODO(burdon): Configure logging.
  log.info('request', { path: c.req.path, data });
  await next();
  log.info('response', { path: c.req.path, status: c.res.status });
});

/**
 * Error handling.
 * https://hono.dev/api/exception#handling-httpexception
 */
root.onError((err, c) => {
  const response = err instanceof HTTPException ? err.getResponse() : new Response('Request failed', { status: 500 });
  if (response.status === 401) {
    return c.redirect('/signup');
  } else if (response.status < 500) {
    log.info('invalid request', { status: response.status, statusCode: response.statusText, err: err.message });
  } else {
    log.error('request failed', { err });
  }

  return response;
});

root.route('/testing', testing);
root.route('/chess', chess);
// root.route('/chat', chat);
// root.route('/signal', signaling);

export default root;
