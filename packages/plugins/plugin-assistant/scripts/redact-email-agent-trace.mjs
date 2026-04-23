#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Strip identifiable narrative, email topics, and profile URLs from the
 * email-agent trace space export used in Storybook/tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, '../src/testing/data/email-agent-trace.dx.json');

const ALLOWED_URL_PREFIXES = [
  'https://example.invalid',
  'http://json-schema.org',
  'https://json-schema.org',
  'http://dxn:',
  'dxn:',
];

const allowUrl = (u) => ALLOWED_URL_PREFIXES.some((p) => u.startsWith(p));

const scrubUrlsInString = (s) =>
  s.replace(/https?:\/\/[^\s"'\\)\]}>]*/gi, (m) => (allowUrl(m) ? m : 'https://example.invalid'));

function deepRedactToolJson(node) {
  if (node === null || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      deepRedactToolJson(item);
    }
    return;
  }

  const type = node['@type'] ?? node.type;
  if (type === 'web_search_result' || (typeof type === 'string' && type.includes('web_search'))) {
    if (typeof node.title === 'string' && !node.title.startsWith('[REDACTED')) {
      node.title = '[REDACTED]';
    }
    if (typeof node.url === 'string') {
      node.url = 'https://example.invalid';
    }
  }
  if (typeof type === 'string' && type.includes('org.dxos.type.organization')) {
    if (typeof node.name === 'string') {
      node.name = '[REDACTED]';
    }
    if (typeof node.website === 'string') {
      node.website = 'https://example.invalid';
    }
  }
  if (typeof type === 'string' && type.includes('org.dxos.type.person')) {
    if (Array.isArray(node.urls)) {
      for (const u of node.urls) {
        if (u && typeof u.value === 'string') {
          u.value = 'https://example.invalid';
        }
      }
    }
    if (typeof node.department === 'string') {
      node.department = '[REDACTED]';
    }
  }

  const tn = typeof node.typename === 'string' ? node.typename : '';
  if (tn.includes('org.dxos.type.person') && node.data && typeof node.data === 'object') {
    const d = node.data;
    if (Array.isArray(d.urls)) {
      for (const u of d.urls) {
        if (u && typeof u.value === 'string') {
          u.value = 'https://example.invalid';
        }
      }
    }
    if (typeof d.department === 'string') {
      d.department = '[REDACTED]';
    }
  }
  if (tn.includes('org.dxos.type.organization') && node.data && typeof node.data === 'object') {
    const d = node.data;
    if (typeof d.name === 'string') {
      d.name = '[REDACTED]';
    }
    if (typeof d.website === 'string') {
      d.website = 'https://example.invalid';
    }
  }

  if (typeof node.typename === 'string' && typeof node.text === 'string' && !node.text.startsWith('[REDACTED')) {
    node.text = '[REDACTED]';
  }

  for (const [k, v] of Object.entries(node)) {
    if (k === 'encrypted_content' && typeof v === 'string') {
      continue;
    }
    if (typeof v === 'string') {
      if (k === 'url' || k === 'website') {
        if (/^https?:\/\//i.test(v)) {
          node[k] = 'https://example.invalid';
        }
        continue;
      }
      if (
        (k === 'to' ||
          k === 'cc' ||
          k === 'bcc' ||
          k === 'from' ||
          k === 'references' ||
          k === 'replyTo' ||
          k === 'inReplyTo') &&
        v.length > 0
      ) {
        node[k] = '[REDACTED]';
        continue;
      }
      if (
        (k === 'title' || k === 'snippet' || k === 'subject') &&
        v.length > 0 &&
        !v.startsWith('[REDACTED')
      ) {
        node[k] = '[REDACTED]';
        continue;
      }
      if (/https?:\/\//i.test(v)) {
        node[k] = scrubUrlsInString(v);
      }
    } else if (typeof v === 'object') {
      deepRedactToolJson(v);
    }
  }
}

function redactToolJsonString(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }
  const t = str.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) {
    return str.length > 80 ? '[REDACTED]' : scrubUrlsInString(str);
  }
  try {
    const parsed = JSON.parse(str);
    deepRedactToolJson(parsed);
    return JSON.stringify(parsed);
  } catch {
    return str.length > 80 ? '[REDACTED]' : scrubUrlsInString(str);
  }
}

function redactBlock(block) {
  if (!block || typeof block !== 'object') {
    return;
  }
  const tag = block._tag;
  if (tag === 'text' && typeof block.text === 'string') {
    block.text = '[REDACTED]';
  }
  if (tag === 'summary' && typeof block.content === 'string') {
    block.content = '[REDACTED]';
  }
  if (tag === 'status' && typeof block.statusText === 'string') {
    block.statusText = '[REDACTED]';
  }
  if (tag === 'reasoning' && typeof block.reasoningText === 'string') {
    block.reasoningText = '[REDACTED]';
  }
  if (tag === 'toolCall' && typeof block.input === 'string') {
    block.input = redactToolJsonString(block.input);
  }
  if (tag === 'toolResult' && typeof block.result === 'string') {
    block.result = redactToolJsonString(block.result);
  }
}

function redactEchoExport(data) {
  for (const obj of data.objects ?? []) {
    const t = obj['@type'] ?? '';
    if (t.includes('org.dxos.type.organization')) {
      if (typeof obj.name === 'string') {
        obj.name = '[REDACTED]';
      }
      if (typeof obj.website === 'string') {
        obj.website = 'https://example.invalid';
      }
    }
    if (t.includes('org.dxos.type.person')) {
      if (Array.isArray(obj.urls)) {
        for (const u of obj.urls) {
          if (u && typeof u.value === 'string') {
            u.value = 'https://example.invalid';
          }
        }
      }
      if (typeof obj.department === 'string') {
        obj.department = '[REDACTED]';
      }
    }
  }

  for (const feed of data.feeds ?? []) {
    for (const msg of feed.messages ?? []) {
      const mtype = msg['@type'] ?? '';
      if (mtype.includes('org.dxos.type.traceMessage')) {
        for (const ev of msg.events ?? []) {
          if (ev.type === 'assistant.completeBlock' && ev.data?.block) {
            redactBlock(ev.data.block);
          }
        }
      }
      if (mtype.includes('org.dxos.type.message')) {
        for (const b of msg.blocks ?? []) {
          redactBlock(b);
        }
      }
    }
  }
}

const raw = fs.readFileSync(target, 'utf8');
const data = JSON.parse(raw);
redactEchoExport(data);
fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
