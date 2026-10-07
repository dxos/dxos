//
// Copyright 2026 DXOS.org
//

/**
 * Runs the assembled plugin against a stand-in for the Stream Deck application, then drives it as
 * Composer would, and asserts what reached the device.
 *
 * This exercises what unit tests cannot: the bundle actually loading in Node, the Elgato SDK
 * registering, and module initialization order inside the single-file bundle. Every one of those has
 * broken in a way the unit tests could not see.
 *
 * Usage: node scripts/smoke.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(projectRoot, 'assets/manifest.json'), 'utf8'));
const pluginDir = join(projectRoot, `${manifest.UUID}.sdPlugin`);

if (!existsSync(join(pluginDir, 'bin/plugin.mjs'))) {
  console.error(`Assembled plugin not found: ${pluginDir}`);
  console.error('Run `moon run composer-stream-deck:assemble` first.');
  process.exit(1);
}

// Ports are fixed rather than ephemeral: the bridge port is the plugin's own contract, and the
// stand-in port is passed to the child. Both are loopback-only.
const STREAM_DECK_PORT = 28765;
const BRIDGE_PORT = 21435;

const info = {
  application: { font: 'Inter', language: 'en', platform: 'mac', platformVersion: '15.0.0', version: '7.1.0' },
  plugin: { uuid: manifest.UUID, version: manifest.Version },
  devicePixelRatio: 2,
  colors: {},
  devices: [{ id: 'device-1', name: 'Stream Deck +', size: { columns: 4, rows: 2 }, type: 7 }],
};

const failures = [];
const check = (label, condition, detail) => {
  if (condition) {
    console.log(`  ok  ${label}`);
  } else {
    failures.push(label);
    console.error(`fail  ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//
// Stand in for the Stream Deck application.
//

let registered;
let pluginSocket;
const commands = [];
const streamDeck = new WebSocketServer({ host: '127.0.0.1', port: STREAM_DECK_PORT });
streamDeck.on('connection', (socket) => {
  pluginSocket = socket;
  socket.on('message', (data) => {
    const message = JSON.parse(String(data));
    if (message.event === 'registerPlugin') {
      registered = message.uuid;
    } else {
      commands.push(message);
    }
  });

  // Stream Deck announces the actions already placed on the device once the plugin registers.
  const appear = (uuid, controller, column) =>
    socket.send(
      JSON.stringify({
        event: 'willAppear',
        action: uuid,
        context: `${uuid}:${column}`,
        device: 'device-1',
        payload: { controller, coordinates: { column, row: 0 }, isInMultiAction: false, settings: {} },
      }),
    );
  setTimeout(() => {
    appear(`${manifest.UUID}.favorite`, 'Keypad', 0);
    appear(`${manifest.UUID}.favorite`, 'Keypad', 1);
    appear(`${manifest.UUID}.monitor`, 'Encoder', 0);
  }, 300);
});

const child = spawn(
  process.execPath,
  [
    'bin/plugin.mjs',
    '-port',
    String(STREAM_DECK_PORT),
    '-pluginUUID',
    manifest.UUID,
    '-registerEvent',
    'registerPlugin',
    '-info',
    JSON.stringify(info),
  ],
  { cwd: pluginDir, stdio: ['ignore', 'inherit', 'inherit'] },
);

let exited;
child.on('exit', (code) => (exited = code));

try {
  await wait(1500);

  check('the plugin process is still running', exited === undefined, { exitCode: exited });
  check('the plugin registered with Stream Deck', registered === manifest.UUID, { registered });
  check(
    'placed keys and dials show the offline state before Composer connects',
    commands.some((command) => command.event === 'setImage') &&
      commands.some((command) => command.event === 'setFeedback'),
    commands.map((command) => command.event),
  );
  check(
    'the dial layout is applied on appear',
    commands.some((command) => command.event === 'setFeedbackLayout' && command.payload.layout === '$B1'),
  );

  //
  // Stand in for Composer.
  //

  const inbox = [];
  const client = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}`);
  client.on('message', (data) => inbox.push(JSON.parse(String(data))));
  await new Promise((resolve, reject) => {
    client.once('open', resolve);
    client.once('error', reject);
  });
  await wait(200);

  check('the bridge greets Composer with the device profile', inbox[0]?._tag === 'hello', inbox[0]);
  check(
    'the greeting carries the Stream Deck + profile',
    inbox[0]?.device?.keys === 8 && inbox[0]?.device?.dials === 4,
    inbox[0]?.device,
  );

  const before = commands.length;
  client.send(
    JSON.stringify({
      _tag: 'frame',
      keys: [{ svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', target: 'eid:1' }, null],
      dials: [{ title: 'Objects', value: '128', bar: 0.5 }],
    }),
  );
  await wait(500);

  const applied = commands.slice(before);
  const images = applied.filter((command) => command.event === 'setImage').map((command) => command.payload.image);
  check('the frame reached the keys', images.length === 2, applied);
  // The application rejects a bare SVG string and silently falls back to the manifest icon, so
  // asserting that setImage was merely called cannot tell a working key from a blank one.
  check(
    'key images are encoded as data URIs',
    images.length > 0 && images.every((image) => typeof image === 'string' && image.startsWith('data:image/svg+xml')),
    images.map((image) => String(image).slice(0, 40)),
  );
  const feedback = applied.filter((command) => command.event === 'setFeedback').map((command) => command.payload);
  check(
    'the frame reached the dial',
    feedback.some((payload) => payload.title === 'Objects' && payload.value === '128'),
    feedback,
  );
  check(
    'the progress bar is expressed as a percentage',
    feedback.some((payload) => payload.indicator?.value === 50),
    feedback,
  );

  // A press on the second Favorite key must reach Composer as slot 1 — slots are positional, so this
  // is what proves the ordering the user sees matches the ordering the frame was built for.
  pluginSocket.send(
    JSON.stringify({
      event: 'keyDown',
      action: `${manifest.UUID}.favorite`,
      context: `${manifest.UUID}.favorite:1`,
      device: 'device-1',
      payload: { controller: 'Keypad', coordinates: { column: 1, row: 0 }, isInMultiAction: false, settings: {} },
    }),
  );
  await wait(300);

  const input = inbox.find((message) => message._tag === 'input');
  check('a key press is reported to Composer with its slot', input?.kind === 'keyDown' && input?.slot === 1, input);

  client.close();
} finally {
  child.kill();
  streamDeck.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll checks passed.');
process.exit(0);
