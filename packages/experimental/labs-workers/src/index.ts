//
// Copyright 2024 DXOS.org
//

import { type Ai } from '@cloudflare/ai';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { html } from 'hono/html';
import { HTTPException } from 'hono/http-exception';
import { jwt, sign } from 'hono/jwt';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';

import { log } from '@dxos/log';

import { chat, type ChatRequest, chatStream } from './ai';
import { messages, sendEmail } from './email';
import { UserManager, type User } from './users';

// TODO(burdon): Zod validator middleware: https://hono.dev/concepts/stacks
//  https://github.com/honojs/middleware/tree/main/packages/zod-openapi

// TODO(burdon): Geo: https://developers.cloudflare.com/workers/examples/geolocation-hello-world

export type Env = {
  Bindings: {
    WORKER_ENV: 'production' | 'local';

    // https://developers.cloudflare.com/workers/configuration/secrets

    // Admin API key.
    API_KEY: string;

    // JWT Cookie.
    JWT_SECRET: string;

    AI: Ai;
    DB: D1Database;
  };
};

// https://hono.dev/getting-started/cloudflare-workers
// https://developers.cloudflare.com/workers/runtime-apis/request

const app = new Hono<Env>();

// TODO(burdon): Logging/Baselime?
app.use(logger());
app.use(timing());

// https://hono.dev/api/exception#handling-httpexception
app.onError((err) => {
  const response = err instanceof HTTPException ? err.getResponse() : new Response('Request failed', { status: 500 });
  if (response.status >= 500) {
    log.error('request failed', { err });
  } else {
    // TODO(burdon): Just log.
    log.info('invalid request', { status: response.status, statusCode: response.statusText, err: err.message });
  }

  return response;
});

// https://hono.dev/concepts/middleware
app.use(async (context, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  context.res.headers.set('X-Response-Time', `${end - start}`);
});

//
// Auth
//

app.use('/api/*', (context, next) => {
  const value = context.req.header('X-API-KEY');
  if (value !== context.env.API_KEY) {
    throw new HTTPException(401);
  }

  return next();
});

// TODO(burdon): Does JWT signing/validate inc response time significantly (re pricing plan).
app.use('/app/*', (context, next) => {
  const token = getCookie(context, 'access_token');
  log.info('AUTH', { token });

  const jwtMiddleware = jwt({
    secret: context.env.JWT_SECRET,
    cookie: 'access_token',
  });

  return jwtMiddleware(context, next);
});

/**
 * Set JWT from one time link.
 */
app.get('/access', async (context) => {
  // Check token matches.
  const { searchParams } = new URL(context.req.url);
  const email = decodeURIComponent(searchParams.get('email')!);
  const accessToken = decodeURIComponent(searchParams.get('access_token')!);
  const user = await new UserManager(context.env.DB).getUserByEmail(email);
  if (!user || !accessToken || user.accessToken !== accessToken) {
    throw new HTTPException(401);
  }

  // TODO(burdon): Payload may designate agent access.
  const token = await sign({ agent: false }, context.env.JWT_SECRET);
  log.info('authorized', { user, token });

  // https://hono.dev/helpers/cookie
  // TODO(burdon): https://hono.dev/helpers/cookie#following-the-best-practices
  // https://stackoverflow.com/questions/37582444/jwt-vs-cookies-for-token-based-authentication
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
  setCookie(context, 'access_token', token, {
    // domain: 'https://labs-workers.dxos.workers.dev',
    // secure: context.env.WORKER_ENV === 'production',
    // expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: false,
  });

  // TODO(burdon): Add access token to HALO.
  // TODO(burdon): Remove access token (one-off only? Otherwise could be shared).

  log.info('redirecting...');
  return context.redirect('/app/home');
});

//
// App
//

app.get('/app/home', async (context) => {
  // https://hono.dev/helpers/html
  return context.html(html`
    <!doctype html>
    <h1>Hello DXOS!</h1>
  `);
});

// TODO(burdon): Test admin/submission form.

//
// Admin API
//

/***
 * ```bash
 * curl -s -v -H "X-API-KEY: test-key" http://localhost:8787/api/users
 * ```
 */
app.get('/api/users', async (context) => {
  const result = await new UserManager(context.env.DB).getUsers();
  return context.json(result);
});

/**
 * ```bash
 *  curl -s -v -H "X-API-KEY: test-key" -X POST -H "Content-Type: application/json" http://localhost:8787/api/users --data '{ "email": "rich@dxos.org" }'
 * ```
 */
app.post('/api/users', async (context) => {
  const user = await context.req.json<User>();
  await new UserManager(context.env.DB).upsertUser(user);

  if (context.env.WORKER_ENV === 'production') {
    const [result] = await sendEmail([user], messages.signup);
    if (result.error) {
      throw new HTTPException(502, { message: 'Error sending email.' });
    }
  }

  return context.json(user);
});

/**
 * ```bash
 * curl -s -v -H "X-API-KEY: test-key" -X DELETE http://localhost:8787/api/users/1
 * ```
 */
app.delete('/api/users/:userId', async (context) => {
  const { userId } = context.req.param();
  await new UserManager(context.env.DB).deleteUser(userId);
  return new Response();
});

/**
 * ```bash
 * curl -s -v -X POST -H "Content-Type: application/json" -H "X-API-KEY: test-key" http://localhost:8787/api/users/authorize --data '{ "next": 1 }' | jq
 * ```
 */
app.post('/api/users/authorize', async (context) => {
  const userManager = new UserManager(context.env.DB);
  let { next, userIds } = await context.req.json<{ next?: number; userIds?: number[] }>();
  if (next) {
    userIds = (await userManager.getUsersByDate(next)).map((user) => user.id);
  }

  if (!userIds?.length) {
    return context.json([]);
  }

  const users = await userManager.authorizeUsers(userIds);

  if (context.env.WORKER_ENV === 'production') {
    const results = await sendEmail(users, messages.welcome);
    for (const { userId, error } of results) {
      if (error) {
        await userManager.updateUser(userId, 'E');
      }
    }
    if (results.some((result) => result.error)) {
      throw new HTTPException(502, { message: 'Error sending email' });
    }
  }

  return context.json(users);
});

//
// AI
//

/**
 * ```bash
 * curl -s -v -H "X-API-KEY: test-key" -X POST -H "Content-Type: application/json" http://localhost:8787/api/users --data '{ "messages": [{ "content": "hello" }] }'
 * ```
 */
app.post('/api/chat', async (context) => {
  const request = await context.req.json<ChatRequest>();
  const result = await chat(context.env.AI, request);
  return context.json(result);
});

/**
 *
 */
// TODO(burdon): Modelfusion client.
app.post('/api/chat/stream', async (context) => {
  const request = await context.req.json<ChatRequest>();
  const stream = await chatStream(context.env.AI, request);
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  });
});

export default app;
