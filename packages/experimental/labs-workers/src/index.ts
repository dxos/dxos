//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';

import { log } from '@dxos/log';

import api from './api';
import app from './app';
import chat from './chat';
import { type Env } from './defs';
import signaling from './signaling';

export * from './signaling';

// TODO(burdon): Move to w3 or new monorepo repo.
// TODO(burdon): CI: https://developers.cloudflare.com/workers/configuration/continuous-integration
// TODO(burdon): Cron: https://developers.cloudflare.com/workers/configuration/cron-triggers
// TODO(burdon): Sites (replace netlify): https://developers.cloudflare.com/workers/configuration/sites/start-from-existing
// TODO(burdon): Email handler: https://developers.cloudflare.com/email-routing/email-workers/enable-email-workers

// TODO(burdon): Domains.
//  https://developers.cloudflare.com/workers/configuration/routing

// TODO(burdon): Zod validator middleware: https://hono.dev/concepts/stacks
//  https://github.com/honojs/middleware/tree/main/packages/zod-openapi

// TODO(burdon): Geo (privacy).
//  https://developers.cloudflare.com/workers/examples/geolocation-hello-world

// https://hono.dev/getting-started/cloudflare-workers
// https://developers.cloudflare.com/workers/runtime-apis/request

const root = new Hono<Env>();

// TODO(burdon): Logging/Baselime?
root.use(logger());
root.use(prettyJSON({ space: 2 }));
root.use(timing());

/**
 * Custom middleware.
 * https://hono.dev/concepts/middleware
 */
root.use(async (context, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  context.res.headers.set('X-Response-Time', `${end - start}`);
});

/**
 * Error handling.
 * https://hono.dev/api/exception#handling-httpexception
 */
root.onError((err, context) => {
  const response = err instanceof HTTPException ? err.getResponse() : new Response('Request failed', { status: 500 });
  if (response.status === 401) {
    return context.redirect('/signup');
  } else if (response.status < 500) {
    log.info('invalid request', { status: response.status, statusCode: response.statusText, err: err.message });
  } else {
    log.error('request failed', { err });
  }

  return response;
});

root.route('/', app);
root.route('/api', api);
root.route('/chat', chat);
root.route('/signal', signaling);

export default root;
