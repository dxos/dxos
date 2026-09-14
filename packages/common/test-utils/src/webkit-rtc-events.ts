//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { closeSync, constants, mkdirSync, mkdtempSync, openSync, readSync, rmSync, writeSync } from 'node:fs';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Names the file WebKit's WPE/GTK build writes each RTCPeerConnection event to as a JSON line. */
export const WEBKIT_RTC_EVENTS_FILE_ENV = 'WEBKIT_WEBRTC_JSON_EVENTS_FILE';

export type WebKitRtcEventCaptureOptions = {
  /** Appended to, never truncated. */
  outputFile: string;
  /** Recorded on the capture's first line. */
  details?: Record<string, unknown>;
};

export type WebKitRtcEventCapture = {
  /** Value for {@link WEBKIT_RTC_EVENTS_FILE_ENV}. */
  fifoPath: string;
};

const captures = new Map<string, WebKitRtcEventCapture>();

/**
 * Drains a FIFO private to this process into `outputFile` until the process exits.
 * Throws when the FIFO cannot be created or opened, since WebKit crashes every renderer whose fopen of it fails.
 */
export const startWebKitRtcEventCapture = ({
  outputFile,
  details,
}: WebKitRtcEventCaptureOptions): WebKitRtcEventCapture => {
  const existing = captures.get(outputFile);
  if (existing) {
    return existing;
  }

  mkdirSync(dirname(outputFile), { recursive: true });
  // A fresh directory per process, so no stale or foreign FIFO can occupy the path.
  const fifoDir = mkdtempSync(join(tmpdir(), 'dx-wkrtc-'));
  const fifoPath = join(fifoDir, 'events.fifo');
  let outFd: number | undefined;
  let fifoFd: number | undefined;
  try {
    execFileSync('mkfifo', ['-m', '600', fifoPath], { stdio: ['ignore', 'ignore', 'pipe'] });
    outFd = openSync(outputFile, 'a');
    // O_RDWR holds a write end too, so WebKit's fopen never blocks and the reader never sees EOF.
    fifoFd = openSync(fifoPath, constants.O_RDWR | constants.O_NONBLOCK);
    // Opens the path for writing exactly as WebKit's fopen(path, "w") will.
    const probeFd = openSync(fifoPath, 'w');
    writeAll(
      probeFd,
      Buffer.from(
        `${JSON.stringify({ dxWkrtc: 'capture-started', t: Date.now(), pid: process.pid, fifoPath, ...details })}\n`,
      ),
    );
    closeSync(probeFd);
  } catch (err) {
    const cleanupErrors = [outFd, fifoFd].flatMap((fd) => (fd === undefined ? [] : attempt(() => closeSync(fd))));
    cleanupErrors.push(...attempt(() => rmSync(fifoDir, { recursive: true, force: true })));
    // Playwright reports only an error's own message and stack, so every failure is carried in the message.
    throw new Error(
      [
        `WebKit RTC event capture could not open a FIFO at ${fifoPath} draining into ${outputFile}`,
        err,
        ...cleanupErrors,
      ]
        .map(String)
        .join('\n'),
    );
  }

  const out = outFd;
  const fifo = fifoFd;
  const reader = new Socket({ fd: fifo, readable: true, writable: false });
  const drainReader = (): void => {
    for (let chunk: unknown = reader.read(); chunk !== null; chunk = reader.read()) {
      if (!Buffer.isBuffer(chunk)) {
        throw new Error(`WebKit RTC event capture read a non-buffer chunk from ${fifoPath}`);
      }
      writeAll(out, chunk);
    }
  };
  reader.on('readable', drainReader);
  reader.on('error', (err) => {
    throw new Error(`WebKit RTC event capture failed reading ${fifoPath}: ${err.stack ?? err.message}`);
  });
  // The worker's own shutdown ends the capture; the exit hook below flushes what is still in the pipe.
  reader.unref();

  process.on('exit', () => {
    drainReader();
    const buffer = Buffer.alloc(64 * 1024);
    for (let bytes = readPending(fifo, buffer); bytes > 0; bytes = readPending(fifo, buffer)) {
      writeAll(out, buffer.subarray(0, bytes));
    }
    closeSync(out);
    rmSync(fifoDir, { recursive: true, force: true });
  });

  const capture = { fifoPath };
  captures.set(outputFile, capture);
  return capture;
};

const writeAll = (fd: number, data: Buffer): void => {
  for (let offset = 0; offset < data.length;) {
    offset += writeSync(fd, data, offset, data.length - offset);
  }
};

/** Bytes read from a non-blocking FIFO, 0 once it is empty. */
const readPending = (fd: number, buffer: Buffer): number => {
  try {
    return readSync(fd, buffer, 0, buffer.length, null);
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'EAGAIN') {
      return 0;
    }
    throw err;
  }
};

const attempt = (fn: () => void): unknown[] => {
  try {
    fn();
    return [];
  } catch (err) {
    return [err];
  }
};
