#!/usr/bin/env node

/**
 * HTTP proxy that logs all requests/responses and forwards them to the Anthropic API.
 *
 * Usage:
 *   node scripts/anthropic-proxy.mjs [--port 8080]
 *
 * Then point your client at http://localhost:8080 instead of https://api.anthropic.com.
 */

import { createServer } from 'node:http';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = join(__dirname, '..', 'logs');
const ANTHROPIC_BASE = 'https://api.anthropic.com';

const port = parseInt(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '8080', 10);

mkdirSync(LOGS_DIR, { recursive: true });

let requestCounter = 0;

const server = createServer(async (req, res) => {
  const id = String(++requestCounter).padStart(4, '0');
  const timestamp = new Date().toISOString();
  const logFile = join(LOGS_DIR, `${id}_${req.method}_${req.url.replace(/[^a-zA-Z0-9]/g, '_')}.json`);

  // Collect request body.
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const requestBody = Buffer.concat(chunks).toString('utf-8');

  let parsedRequestBody;
  try {
    parsedRequestBody = JSON.parse(requestBody);
  } catch {
    parsedRequestBody = requestBody;
  }

  // Build headers for upstream, forwarding everything except host.
  const upstreamHeaders = { ...req.headers };
  delete upstreamHeaders.host;
  delete upstreamHeaders['content-length'];

  const upstreamUrl = `${ANTHROPIC_BASE}${req.url}`;

  console.log(`[${timestamp}] #${id} ${req.method} ${req.url} -> ${upstreamUrl}`);

  const logEntry = {
    id,
    timestamp,
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: parsedRequestBody,
    },
    response: null,
  };

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        ...upstreamHeaders,
        ...(requestBody.length > 0 ? { 'content-length': String(Buffer.byteLength(requestBody)) } : {}),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? requestBody : undefined,
    });

    // Check if the response is streaming (SSE).
    const contentType = upstreamRes.headers.get('content-type') || '';
    const isStreaming = contentType.includes('text/event-stream');

    // Forward status and headers.
    const responseHeaders = {};
    for (const [key, value] of upstreamRes.headers.entries()) {
      responseHeaders[key] = value;
    }
    // Remove content-encoding since fetch already decompresses.
    delete responseHeaders['content-encoding'];
    delete responseHeaders['content-length'];
    responseHeaders['transfer-encoding'] = 'chunked';

    res.writeHead(upstreamRes.status, responseHeaders);

    if (isStreaming) {
      // Stream SSE events through and log them.
      const streamLogFile = logFile.replace('.json', '_stream.jsonl');
      const reader = upstreamRes.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        fullResponse += text;
        res.write(text);
        appendFileSync(streamLogFile, text);
      }
      res.end();

      logEntry.response = {
        status: upstreamRes.status,
        headers: responseHeaders,
        body: '[streamed - see _stream.jsonl]',
      };
    } else {
      const responseBody = await upstreamRes.text();
      res.end(responseBody);

      let parsedResponseBody;
      try {
        parsedResponseBody = JSON.parse(responseBody);
      } catch {
        parsedResponseBody = responseBody;
      }

      logEntry.response = {
        status: upstreamRes.status,
        headers: responseHeaders,
        body: parsedResponseBody,
      };
    }

    console.log(`[${timestamp}] #${id} <- ${upstreamRes.status} (${contentType})`);
  } catch (err) {
    console.error(`[${timestamp}] #${id} ERROR:`, err.message);
    logEntry.response = { error: err.message };
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'proxy error', message: err.message }));
  }

  writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
  console.log(`[${timestamp}] #${id} logged -> ${logFile}`);
});

server.listen(port, () => {
  console.log(`Anthropic proxy listening on http://localhost:${port}`);
  console.log(`Proxying to ${ANTHROPIC_BASE}`);
  console.log(`Logs directory: ${LOGS_DIR}`);
});
