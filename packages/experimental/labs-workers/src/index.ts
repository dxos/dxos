//
// Copyright 2024 DXOS.org
//

import { type Ai } from '@cloudflare/ai';
import { Hono, type HonoRequest } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { chat, type ChatRequest, chatStream } from './ai';
import { getUsers, upsertUser, type User } from './users';

// TODO(burdon): Geo: https://developers.cloudflare.com/workers/examples/geolocation-hello-world
// TODO(burdon): Logging/baselime?

// TODO(burdon): Zod validator middleware: https://hono.dev/concepts/stacks

export type Env = {
  Bindings: {
    AI: Ai;
    DB: D1Database;

    // https://developers.cloudflare.com/workers/configuration/secrets
    API_KEY: string;
  };
};

// https://hono.dev/getting-started/cloudflare-workers
// TODO(burdon): Static content (e.g., Web app).
const app = new Hono<Env>();

// TODO(burdon): Auth middleware?
//  https://hono.dev/concepts/middleware
//  https://hono.dev/getting-started/cloudflare-workers#using-variables-in-middleware
//  https://developers.cloudflare.com/workers/examples/basic-auth/
//  https://developers.cloudflare.com/workers/examples/auth-with-headers/
const auth = (req: HonoRequest, apiKey: string) => {
  const value = req.header('X-API-KEY');
  if (value !== apiKey) {
    throw new HTTPException(401);
  }
};

//
// Users
//

// curl -s -v -H "X-API-KEY: xxx" http://localhost:8787/api/users
app.get('/api/users', async (context) => {
  auth(context.req, context.env.API_KEY);
  const result = await getUsers(context.env.DB);
  return context.json(result);
});

// curl -s -v -H "X-API-KEY: test-key" -X POST -H "Content-Type: application/json" http://localhost:8787/api/users --data '{ "email": "rich.burdon@gmail.com" }'
app.post('/api/users', async (context) => {
  auth(context.req, context.env.API_KEY);
  const user = await context.req.json<User>();
  const result = await upsertUser(context.env.DB, user);
  return context.json(result);
});

//
// AI
//

// curl -s -v -H "X-API-KEY: test-key" -X POST -H "Content-Type: application/json" http://localhost:8787/api/users --data '{ "messages": [{ "content": "hello" }] }'
app.post('/api/chat', async (context) => {
  const request = await context.req.json<ChatRequest>();
  const result = await chat(context.env.AI, request);
  return context.json(result);
});

app.post('/api/chat/stream', async (context) => {
  const request = await context.req.json<ChatRequest>();
  const stream = await chatStream(context.env.AI, request);
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  });
});

export default app;
