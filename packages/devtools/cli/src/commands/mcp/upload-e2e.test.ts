//
// Copyright 2026 DXOS.org
//

import { afterAll, beforeAll, describe, test } from '@effect/vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

import { ClaudeAgent } from '@dxos/test-utils/claude-agent';

import { McpSession, bootstrapProfile, dxBin, runDx } from '../../testing/index.ts';

/**
 * End-to-end: a real Claude Code subprocess uploads an image through `dx mcp serve` and attaches it
 * to a task — `createUpload`, the `curl` it returns, `file.createFromUpload`, `tasks.addArtifact`.
 * Every claim is read back by a separate `dx` process, down to the stored bytes, so a turn that
 * only narrates success fails.
 *
 * Tagged `manual` like `agent-e2e.test.ts`: it spends real tokens and needs `claude` on PATH.
 */

const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.DX_E2E_MODEL ?? 'sonnet';
const SERVER = 'dx-dev';
const tool = (name: string) => `mcp__${SERVER}__${name}`;

/**
 * The server's surface plus `curl` alone: the upload URL is written for a shell, and moving the
 * bytes with anything the agent generates itself would defeat what `createUpload` is for.
 */
const ALLOWED_TOOLS = [
  tool('queryOperations'),
  tool('invokeOperation'),
  tool('loadSkill'),
  tool('whoami'),
  tool('createUpload'),
  'Bash(curl:*)',
];

const TURN_TIMEOUT = 300_000;
const TEST_TIMEOUT = TURN_TIMEOUT + 180_000;

const TASK_TYPE = 'org.dxos.type.task';
const TASK_SET_TYPE = 'org.dxos.type.taskSet';
const FILE_TYPE = 'org.dxos.type.file';
const BLOB_TYPE = 'org.dxos.type.blob';

const TASK_TITLE = 'Capture the onboarding screenshot';
const IMAGE_NAME = 'onboarding.png';

type Row = Record<string, unknown> & { id: string };
type AddObjectResult = { readonly id: string };

describe.skipIf(!API_KEY)('claude code uploads a file through dx mcp serve', { tags: ['manual'] }, () => {
  let home: string;
  let workdir: string;
  let spaceId: string;
  let image: Uint8Array;
  let agent: ClaudeAgent;

  const query = (typename: string): Row[] => {
    const { stdout, stderr, status } = runDx(
      ['--json', 'database', 'query', '--space-id', spaceId, '--typename', typename],
      { home, timeout: 120_000 },
    );
    if (status !== 0) {
      throw new Error(`dx database query failed (${status}): ${stderr}`);
    }
    return JSON.parse(stdout);
  };

  beforeAll(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-upload-e2e-home-'));
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-upload-e2e-cwd-'));
    image = makePng(48, 32);
    fs.writeFileSync(path.join(workdir, IMAGE_NAME), image);

    spaceId = bootstrapProfile(home);
    const scaffold = await McpSession.open({ home });
    try {
      const taskSet = await scaffold.invoke<AddObjectResult>(
        'org.dxos.operation.space.addObject',
        { object: { '@type': TASK_SET_TYPE, 'name': 'Upload E2E backlog', 'tasks': [], 'milestones': [] } },
        spaceId,
      );
      await scaffold.invoke(
        'org.dxos.operation.tasks.create',
        { taskSet: { '/': taskSet.id }, title: TASK_TITLE },
        spaceId,
      );
    } finally {
      await scaffold.close();
    }

    agent = ClaudeAgent.start({
      cwd: workdir,
      mcpServers: {
        [SERVER]: {
          command: dxBin,
          args: ['mcp', 'serve'],
          env: {
            HOME: home,
            PROTO_HOME: process.env.PROTO_HOME ?? path.join(process.env.HOME ?? '', '.proto'),
            PATH: process.env.PATH ?? '',
            DX_DEBUG: 'error',
            NO_COLOR: '1',
            PROTO_REPORTER: 'text',
          },
        },
      },
      apiKey: API_KEY,
      model: MODEL,
      allowedTools: ALLOWED_TOOLS,
      timeout: TURN_TIMEOUT,
    });
  }, 600_000);

  afterAll(async () => {
    await agent?.close();
    for (const dir of [home, workdir]) {
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test(
    'the agent uploads the image and attaches it to the task',
    async ({ expect }) => {
      expect(query(FILE_TYPE)).toHaveLength(0);

      const turn = await agent.send(
        `The file ./${IMAGE_NAME} in your working directory is a screenshot. Using the ${SERVER} MCP server, ` +
          `upload it into space ${spaceId} (use createUpload and the curl command it returns, then create the File ` +
          `from the upload), and attach the resulting file as an artifact to the existing task titled ` +
          `"${TASK_TITLE}". Do not create a new task.`,
      );

      expect(turn.isError, `turn failed: ${turn.result}`).toBe(false);
      expect(turn.toolCalls).toContain(tool('createUpload'));

      const files = query(FILE_TYPE);
      // The agent's own account rides the message, so a failure says what it believed it did.
      expect(files, `agent said: ${turn.result}`).toHaveLength(1);
      const [file] = files;
      expect(file.name).toBe(IMAGE_NAME);

      const tasks = query(TASK_TYPE);
      expect(tasks).toHaveLength(1);
      const artifacts = tasks[0].artifacts;
      expect(Array.isArray(artifacts) ? artifacts.map(refId) : artifacts).toEqual([file.id]);

      // The bytes, not only the object: an upload that stored an empty or truncated blob would
      // still produce a File row and a ref.
      const [blob] = query(BLOB_TYPE);
      expect(refId(file.data)).toBe(blob.id);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBe(image.byteLength);
      expect(inlineBytes(blob)).toEqual(Buffer.from(image).toString('base64'));
    },
    TEST_TIMEOUT,
  );
});

/** The object id a serialized ref envelope points at. */
const refId = (value: unknown): string | undefined => {
  const uri = typeof value === 'object' && value !== null && '/' in value ? String(value['/']) : undefined;
  return uri?.split('/').pop();
};

/** The inline bytes of a serialized blob, as base64. */
const inlineBytes = (blob: Row): string | undefined => {
  const data = blob.data;
  if (typeof data !== 'object' || data === null || !('bytes' in data)) {
    return undefined;
  }
  const { bytes } = data;
  if (typeof bytes === 'string') {
    return bytes;
  }
  return Array.isArray(bytes) ? Buffer.from(bytes).toString('base64') : undefined;
};

/** A real PNG (a colour gradient) built in memory, so the suite ships no binary fixture. */
const makePng = (width: number, height: number): Uint8Array => {
  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    rows.push(0);
    for (let x = 0; x < width; x++) {
      rows.push(Math.round((x / width) * 255), Math.round((y / height) * 255), 160);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const chunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const crc32 = (bytes: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};
