//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { html, raw } from 'hono/html';
import { HTTPException } from 'hono/http-exception';
import { decode, jwt, sign } from 'hono/jwt';

import { log } from '@dxos/log';

import { UserManager } from '../api/users';
import type { Env } from '../index';

const app = new Hono<Env>();

/**
 * Access control.
 */
app.use('/', (context, next) => {
  const jwtMiddleware = jwt({
    secret: context.env.JWT_SECRET,
    cookie: 'access_token',
  });

  // https://hono.dev/middleware/builtin/jwt
  return jwtMiddleware(context, next);
});

/**
 * Serve app.
 */
// TODO(burdon): Serve app as static resource: https://github.com/honojs/examples/tree/main/serve-static
app.get('/', async (context) => {
  const token = getCookie(context, 'access_token');
  if (!token) {
    return context.redirect('/signup');
  }

  const { payload } = decode(token);
  log.info('token', { payload });

  // https://hono.dev/helpers/html
  // TODO(burdon): Serve content HTML page from netlify.
  return context.html(html`
    <!doctype html>
    <body>
      <h1>Welcome to Composer!</h1>
      <pre>${raw(JSON.stringify(payload, undefined, 2))}</pre>
      <a href="/reset">Logout</a>
    </body>
  `);
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

  // Create access token.
  const payload = { email, composer: true, agent: false };
  const token = await sign(payload, context.env.JWT_SECRET);
  log.info('created token', { user: user.id, payload });

  // https://hono.dev/helpers/cookie
  // TODO(burdon): https://hono.dev/helpers/cookie#following-the-best-practices
  // https://stackoverflow.com/questions/37582444/jwt-vs-cookies-for-token-based-authentication
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
  setCookie(context, 'access_token', token, {
    // NOTE: Setting domain breaks curl.
    secure: context.env.WORKER_ENV === 'production',
    httpOnly: true,
  });

  // TODO(burdon): Add access token to HALO.
  // TODO(burdon): Remove access token (one-off only? Otherwise could be shared).

  log.info('redirecting...');
  return context.redirect('/');
});

/**
 * Remove cookie.
 */
app.get('/reset', async (context) => {
  deleteCookie(context, 'access_token');
  return context.redirect('/');
});

/**
 * Signup form.
 */
app.get('/signup', async (context) => {
  return context.html(html`
    <!doctype html>
    <body>
      <h1>Join the Composer Beta</h1>
      <form class="flex" method="POST">
        <input type="text" name="email" style="padding: 8px" placeholder="Email address" size="40" />
        <button style="padding: 8px">Signup</button>
      </form>
    </body>
  `);
});

/**
 * Process signup.
 */
app.post('/signup', async (context) => {
  const { email } = await context.req.parseBody<{ email: string }>();
  await new UserManager(context.env.DB).upsertUser({ email });
  return context.redirect('/thanks');
});

/**
 * Landing page.
 */
app.get('/thanks', async (context) => {
  return context.html(html`
    <!doctype html>
    <body>
      <h1>Thank you!</h1>
    </body>
  `);
});

export default app;
