//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { chat, type ChatRequest, chatStream } from './chat';
import { type Env } from '../index';

const app = new Hono<Env>();

/**
 * ```bash
 * curl -s -v -H "X-API-KEY: test-key" -X POST -H "Content-Type: application/json" http://localhost:8787/api/users --data '{ "messages": [{ "content": "hello" }] }'
 * ```
 */
app.post('/chat', async (context) => {
  const request = await context.req.json<ChatRequest>();
  const result = await chat(context.env.AI, request);
  return context.json(result);
});

// TODO(burdon): Modelfusion client.
app.post('/stream', async (context) => {
  const request = await context.req.json<ChatRequest>();
  const stream = await chatStream(context.env.AI, request);
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  });
});

export default app;
