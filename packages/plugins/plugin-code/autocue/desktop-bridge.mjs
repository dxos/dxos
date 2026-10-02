//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const installed = new WeakSet();

/**
 * Stands in for the desktop app's native half while autocue drives a `DX_TAURI=true` web build in Chromium,
 * which autocue can record on any platform (it cannot attach to macOS's WKWebView). Every document the page
 * loads from then on gets the globals Tauri injects, so the caller reloads once after installing. The IPC
 * commands coding agents use are answered from Node: `plugin:shell` runs the programs named in `programs` (the
 * staged `dx-agent`, as the app's shell scope does), `plugin:path` resolves the app's data folder, and
 * `plugin:dialog|open` answers the folder picker with `bridge.folder`. Any other command answers `null`.
 *
 * As in the app, a spawned program outlives a reload of the page, and what it prints after one goes nowhere.
 * Programs run with the environment a Finder-launched app has, not the driver's, so the helper has to find the
 * user's tools itself, as it does in the app. Set `AUTOCUE_BRIDGE_TRACE` to log every command.
 */
export const installDesktopBridge = async (page, { programs, appData = join(tmpdir(), 'autocue-app-data') }) => {
  if (installed.has(page)) {
    throw new Error('the desktop bridge is already installed on this page');
  }
  installed.add(page);

  const children = new Map();
  const indices = new Map();
  const bridge = { folder: undefined, unknown: new Set() };

  /** Delivers a channel message to the document that opened the channel, if it is still loaded. */
  const send = async (document, channel, message) => {
    const key = `${document}:${channel}`;
    const index = indices.get(key) ?? 0;
    indices.set(key, index + 1);
    await page
      .evaluate(
        ([document, id, payload]) => {
          if (window.__autocueDocument === document) {
            window.__TAURI_INTERNALS__.runCallback(id, payload);
          }
        },
        [document, channel, { index, message }],
      )
      .catch(() => {});
  };

  const handlers = {
    'plugin:shell|spawn': (document, { program, args, options, onEvent }) => {
      const command = programs[program];
      if (!command) {
        throw new Error(`program not allowed: ${program}`);
      }
      // As the app's shell scope (`args: []` for every program it lets the page run).
      if ((args ?? []).length > 0) {
        throw new Error(`arguments not allowed for ${program}`);
      }
      const channel = Number(String(onEvent).replace('__CHANNEL__:', ''));
      const child = spawn(command, args ?? [], {
        cwd: options?.cwd ?? undefined,
        env: { ...finderEnv(), ...(options?.env ?? {}) },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      children.set(child.pid, child);
      const lines = (stream, event) => {
        let buffer = '';
        stream.setEncoding('utf8');
        stream.on('data', (chunk) => {
          buffer += chunk;
          let newline;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            void send(document, channel, { event, payload: buffer.slice(0, newline) });
            buffer = buffer.slice(newline + 1);
          }
        });
        stream.on('end', () => {
          if (buffer.length > 0) {
            void send(document, channel, { event, payload: buffer });
          }
        });
      };
      lines(child.stdout, 'Stdout');
      lines(child.stderr, 'Stderr');
      child.on('error', (error) => void send(document, channel, { event: 'Error', payload: String(error) }));
      // `close`, not `exit`: as Tauri does, the end is reported only after the output has drained.
      child.on('close', (code, signal) => {
        children.delete(child.pid);
        void send(document, channel, { event: 'Terminated', payload: { code, signal: signal ? 15 : null } });
      });
      return child.pid;
    },
    'plugin:shell|stdin_write': (_document, { pid, buffer }) => {
      children.get(pid)?.stdin.write(typeof buffer === 'string' ? buffer : Buffer.from(buffer));
      return null;
    },
    'plugin:shell|kill': (_document, { pid }) => {
      children.get(pid)?.kill();
      return null;
    },
    // 14 is `BaseDirectory.AppData`.
    'plugin:path|resolve_directory': (_document, { directory }) =>
      directory === 14 ? appData : join(appData, `dir-${directory}`),
    'plugin:path|join': (_document, { paths }) => join(...paths),
    'plugin:dialog|open': () => bridge.folder ?? null,
  };

  await page.exposeBinding('__autocueTauri', async (_source, document, command, args) => {
    if (process.env.AUTOCUE_BRIDGE_TRACE) {
      console.log('[bridge]', command, JSON.stringify(args).slice(0, 200));
    }
    const handler = handlers[command];
    if (!handler) {
      bridge.unknown.add(command);
      return null;
    }
    return handler(document, args ?? {});
  });

  await page.addInitScript(() => {
    const callbacks = new Map();
    let next = 1;
    const documentId = crypto.randomUUID();
    window.__autocueDocument = documentId;
    window.__TAURI__ = {};
    // Read synchronously by `@tauri-apps/plugin-os`, which the app consults at boot.
    window.__TAURI_OS_PLUGIN_INTERNALS__ = {
      arch: 'aarch64',
      eol: '\n',
      exe_extension: '',
      family: 'unix',
      os_type: 'macos',
      platform: 'macos',
      version: '15.0',
    };
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
      plugins: {},
      transformCallback: (callback, once) => {
        const id = next++;
        callbacks.set(id, (data) => {
          if (once) {
            callbacks.delete(id);
          }
          return callback?.(data);
        });
        return id;
      },
      unregisterCallback: (id) => callbacks.delete(id),
      runCallback: (id, data) => callbacks.get(id)?.(data),
      convertFileSrc: (path) => path,
      // A Channel serializes to `__CHANNEL__:<id>`, which is how the native side addresses it too.
      invoke: (command, args) => window.__autocueTauri(documentId, command, JSON.parse(JSON.stringify(args ?? {}))),
    };
  });

  bridge.stop = () => {
    for (const child of children.values()) {
      child.kill();
    }
  };
  return bridge;
};

/** The environment macOS gives an app launched from the Finder: system directories on the path, nothing else. */
const finderEnv = () =>
  Object.fromEntries(
    Object.entries({
      HOME: homedir(),
      LANG: process.env.LANG ?? 'en_US.UTF-8',
      LOGNAME: process.env.LOGNAME,
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
      SHELL: process.env.SHELL,
      TMPDIR: process.env.TMPDIR,
      USER: process.env.USER,
    }).filter(([, value]) => value !== undefined),
  );
