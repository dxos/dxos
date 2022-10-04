//
// Copyright 2022 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/** @jsx h */
import { Application, Context, Router } from 'https://deno.land/x/oak/mod.ts';
import parseUrl from 'https://esm.sh/parse-url';
import { h } from 'https://esm.sh/preact';
import { render } from 'https://esm.sh/preact-render-to-string';

import { defaultConfig } from '../common/config.ts';
import { Log, Command, Message, Post } from '../common/types.ts';
import { App } from './App.tsx';

// https://github.com/denoland/examples/tree/main/with-preact
// https://medium.com/deno-the-complete-reference/json-modules-in-deno-5ecd137a5edc
// https://deno.land/x/oak@v11.1.0/mod.ts

// TODO(burdon): Npm.
//  https://deno.land/manual@v1.26.0/node
// TODO(burdon): Preact lint.
// TODO(burdon): Preact typescript.
//  https://deno.land/manual@v1.26.0/typescript/overview
// TODO(burdon): Read json file.
//  https://medium.com/deno-the-complete-reference/json-modules-in-deno-5ecd137a5edc
// TODO(burdon): Stream.
//  https://medium.com/deno-the-complete-reference/denos-built-in-watcher-1d91cb976349

const config = defaultConfig;

export const makeHtml = (log, compact, title = 'Spyglass') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="/refresh.js"></script>
      </head>
      <body style="margin: 0">
        ${render(<App log={log} compact={compact} />, {}, { pretty: true })}
      </body>
    </html>
  `;
};

//
// Middleware
// https://oakserver.github.io/oak
// https://doc.deno.land/https://deno.land/x/oak@v11.1.0/mod.ts/~/Router
//

const router = new Router();

router.get('/refresh.js', async (ctx: Context) => {
  ctx.response.body = await Deno.readTextFile('./src/static/refresh.js');
  ctx.response.type = 'application/javascript';
});

router.get('/', async (ctx: Context) => {
  const { query: { compact = '' } } = parseUrl(String(ctx.request.url));
  ctx.response.body = makeHtml(log, compact === '1' || compact === 'true');
  ctx.response.type = 'text/html';
});

//
// Refresh middleware
//

const log: Log = {
  messages: []
};

const sockets: Set<WebSocket> = new Set();

router.get('/refresh', async (ctx: Context) => {
  // https://javascript.info/websocket
  // https://doc.deno.land/https://deno.land/x/oak@v11.1.0/mod.ts/~/Context#upgrade
  // https://doc.deno.land/deno/stable/~/Deno.upgradeWebSocket
  const socket = ctx.upgrade(ctx.request);

  socket.onopen = () => {
    sockets.add(socket);
    console.log(`Added client: ${sockets.size}`);
  };
  socket.onclose = () => {
    console.log(`Removed client: ${sockets.size}`);
    sockets.delete(socket);
  };
  socket.onerror = (err) => console.error('WebSocket error:', err);
});

router.post(config.path, async (ctx: Context) => {
  const post = await ctx.request.body().value as Post;
  const { cmd, data } = post;
  switch (cmd) {
    case Command.CLEAR: {
      log.messages.length = 0;
      break;
    }

    case Command.LOG: {
      log.messages.push(data as Message);
      break;
    }
  }

  console.log(`Refreshing clients: ${sockets.size}`);
  sockets.forEach((socket) => {
    socket.send('refresh');
  });
});

//
// Web server
//

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
app.addEventListener('listen', ({ port }) => {
  console.log(`Listening on: http://localhost:${port}`);
});

await app.listen({ port: config.port });
