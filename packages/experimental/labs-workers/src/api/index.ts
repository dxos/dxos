//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { log } from '@dxos/log';

import { createMessage, sendEmail, templates } from './email';
import { Status, type User, UserManager } from './users';
import { DISCORD_INVITE_URL, type Env } from '../defs';

const app = new Hono<Env>();

/**
 * Access control.
 */
app.use('/*', (context, next) => {
  const value = context.req.header('X-API-KEY');
  if (value !== context.env.API_KEY) {
    throw new HTTPException(401);
  }

  return next();
});

// TODO(burdon): Token to auth.
// app.get('/auth/:access_key', async (context) => {
//   const accessKey = context.req.param('access_key');
//   return context.redirect('/users');
// });

/***
 * ```bash
 * curl -s -v -H "X-API-KEY: test-key" http://localhost:8787/api/users
 * ```
 */
app.get('/users', async (context) => {
  const result = await new UserManager(context.env.DB).getUsers();
  return context.json(result);
});

/**
 * ```bash
 *  curl -s -v -H "X-API-KEY: test-key" -X POST -H "Content-Type: application/json" http://localhost:8787/api/users --data '{ "email": "rich@dxos.org" }'
 * ```
 */
app.post('/users', async (context) => {
  const input = await context.req.json<User>();
  const user = await new UserManager(context.env.DB).insertUser(input);
  if (context.env.WORKER_ENV === 'production') {
    await sendEmail(user, createMessage(templates.signup, { invite_url: DISCORD_INVITE_URL }));
  }

  return context.json(user);
});

/**
 * ```bash
 * curl -s -v -H "X-API-KEY: test-key" -X DELETE http://localhost:8787/api/users/1
 * ```
 */
app.delete('/users/:userId', async (context) => {
  const { userId } = context.req.param();
  await new UserManager(context.env.DB).deleteUser(userId);
  return new Response();
});

/**
 * ```bash
 * curl -s -v -X POST -H "Content-Type: application/json" -H "X-API-KEY: test-key" http://localhost:8787/api/users/authorize --data '{ "next": 1 }' | jq
 * ```
 */
app.post('/users/authorize', async (context) => {
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
    for (const user of users) {
      try {
        // Create link.
        const url = new URL(context.req.url);
        const linkUrl = new URL('/access', url.origin);
        linkUrl.searchParams.append('email', user.email);
        linkUrl.searchParams.append('access_token', user.accessToken!);

        // Send message.
        await sendEmail(user, createMessage(templates.welcome, { access_link: linkUrl.toString() }));
      } catch (err) {
        log.catch(err);
        await userManager.updateUser(user.id, Status.ERROR);
      }
    }
  }

  return context.json(users);
});

export default app;
