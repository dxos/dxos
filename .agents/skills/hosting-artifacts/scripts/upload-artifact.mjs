#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Uploads a file to the shared `agent-artifacts` R2 bucket and prints its public URL.
// Signs requests with SigV4 from node's crypto so it needs no wrangler, no aws-cli, and no
// dependencies — the cloud sandbox has only R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.
//
// Usage:
//   upload-artifact.mjs <file> [slug]        # key: demos/<YYYY-MM-DD>-<slug>/<basename>
//   upload-artifact.mjs <file> --key <key>   # explicit key
//   upload-artifact.mjs --delete <key>
//   upload-artifact.mjs --list [prefix]

import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const ACCOUNT_ID = '950816f3f59b079880a1ae33fb0ec320';
const BUCKET = 'agent-artifacts';
const PUBLIC_BASE = 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev';
const HOST = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const REGION = 'auto';

const CONTENT_TYPES = {
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ndjson': 'application/x-ndjson',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.log': 'text/plain',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.cpuprofile': 'application/json',
};

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** Minimal SigV4 for a single S3 request. */
const sign = ({ method, key, payloadHash, headers, query = '' }) => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    fail('R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not set (source .env, or see the hosting-artifacts skill).');
  }

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const allHeaders = { ...headers, 'host': HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const signedHeaders = Object.keys(allHeaders)
    .map((name) => name.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaders.map((name) => `${name}:${String(allHeaders[name]).trim()}\n`).join('');
  // The key is already-encoded path segments; S3 canonicalisation must not re-encode the slashes.
  const canonicalUri = `/${BUCKET}${key ? '/' + key.split('/').map(encodeURIComponent).join('/') : ''}`;
  const canonicalRequest = [method, canonicalUri, query, canonicalHeaders, signedHeaders.join(';'), payloadHash].join(
    '\n',
  );

  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = ['aws4_request'].reduce(
    (acc, part) => hmac(acc, part),
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), REGION), 's3'),
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    url: `https://${HOST}${canonicalUri}${query ? '?' + query : ''}`,
    headers: {
      ...allHeaders,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`,
    },
  };
};

const fail = (message) => {
  console.error(`error: ${message}`);
  process.exit(1);
};

const request = async ({ method, key, body = '', contentType, query }) => {
  const payloadHash = sha256(body);
  const headers = contentType ? { 'content-type': contentType } : {};
  const signed = sign({ method, key, payloadHash, headers, query });
  const response = await fetch(signed.url, { method, headers: signed.headers, body: body.length ? body : undefined });
  if (!response.ok) {
    fail(`${method} ${key || '(bucket)'} → ${response.status} ${response.statusText}\n${await response.text()}`);
  }
  return response;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const main = async () => {
  const args = process.argv.slice(2);

  if (args[0] === '--delete') {
    const key = args[1] ?? fail('usage: --delete <key>');
    await request({ method: 'DELETE', key });
    console.log(`deleted ${key}`);
    return;
  }

  if (args[0] === '--list') {
    const prefix = args[1] ?? '';
    const response = await request({
      method: 'GET',
      key: '',
      query: `list-type=2&prefix=${encodeURIComponent(prefix)}`,
    });
    const body = await response.text();
    const entries = [...body.matchAll(/<Key>(.*?)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>/g)];
    entries.length === 0 && console.log('(empty)');
    for (const [, key, size] of entries) {
      console.log(`${String(size).padStart(10)}  ${key}`);
    }
    return;
  }

  const file = args[0] ?? fail('usage: upload-artifact.mjs <file> [slug] | --key <key>');
  const keyIndex = args.indexOf('--key');
  const name = basename(file);
  const key =
    keyIndex > 0
      ? args[keyIndex + 1]
      : `demos/${new Date().toISOString().slice(0, 10)}-${slugify(args[1] ?? 'artifact')}/${name}`;

  const body = await readFile(file);
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) {
    fail(`unknown extension "${extname(file)}" — pass a known type or add it to CONTENT_TYPES.`);
  }

  await request({ method: 'PUT', key, body, contentType });

  // Verify through the public URL rather than trusting the PUT: a wrong content type or a
  // truncated body is invisible until a reviewer clicks the link.
  const url = `${PUBLIC_BASE}/${key}`;
  const head = await fetch(url, { method: 'HEAD' });
  const served = {
    status: head.status,
    type: head.headers.get('content-type'),
    length: Number(head.headers.get('content-length')),
    etag: head.headers.get('etag')?.replaceAll('"', ''),
    ranges: head.headers.get('accept-ranges'),
  };
  const localMd5 = createHash('md5').update(body).digest('hex');

  const problems = [
    served.status !== 200 && `public URL returned ${served.status}`,
    served.type !== contentType && `served content-type is ${served.type}, expected ${contentType}`,
    served.length !== body.length && `served ${served.length} bytes, uploaded ${body.length}`,
    served.etag !== localMd5 && `ETag ${served.etag} does not match local md5 ${localMd5}`,
    served.ranges !== 'bytes' && 'no Accept-Ranges: bytes — a viewer will not be able to seek',
  ].filter(Boolean);

  if (problems.length > 0) {
    fail(`uploaded but verification failed:\n  - ${problems.join('\n  - ')}`);
  }

  console.log(`${(body.length / 1e6).toFixed(1)} MB  ${contentType}  verified`);
  console.log(url);
};

await main();
