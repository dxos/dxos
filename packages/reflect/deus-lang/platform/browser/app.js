//
// Copyright 2026 DXOS.org
//

// A terminal for a DEUS image running in the page: each command line runs the image's main with those
// arguments, against an in-memory file system the editor shows. The TypeScript kernel (kernel-ts.mjs)
// runs by default; `?kernel=wasm` or `"kernel": "wasm"` in deus.json picks the wasm one. The files the
// page changed are kept in IndexedDB, so a reload resumes where it left off; Reset drops them.

import { createDeus, createFiles } from './host.mjs';

const $ = (id) => document.getElementById(id);
const output = $('output');
const command = $('command');
const editor = $('editor');

/** Splits a command line into words as a POSIX shell does: '…' is literal, "…" honours backslash escapes. */
const split = (line) => {
  const words = [];
  let word;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (/\s/.test(char)) {
      if (word !== undefined) {
        words.push(word);
      }
      word = undefined;
    } else if (char === "'") {
      const end = line.indexOf("'", index + 1);
      word = (word ?? '') + line.slice(index + 1, end < 0 ? line.length : end);
      index = end < 0 ? line.length : end;
    } else if (char === '"') {
      word ??= '';
      for (index++; index < line.length && line[index] !== '"'; index++) {
        word += line[index] === '\\' && index + 1 < line.length ? line[++index] : line[index];
      }
    } else {
      word = (word ?? '') + (char === '\\' && index + 1 < line.length ? line[++index] : char);
    }
  }
  if (word !== undefined) {
    words.push(word);
  }
  return words;
};

const print = (text, className) => {
  const span = document.createElement('span');
  span.textContent = text;
  if (className) {
    span.className = className;
  }
  output.append(span);
  output.scrollTop = output.scrollHeight;
};

const fetchOptional = async (path, as) => {
  const response = await fetch(path);
  return response.ok ? response[as]() : undefined;
};

const started = performance.now();
const [image, config = {}] = await Promise.all([
  fetch('app.image').then((response) => response.text()),
  fetchOptional('deus.json', 'json'),
]);
const base = config.files ?? {};
const fs = createFiles(base);
const env = config.env ?? {};
const cwd = config.cwd ?? '/';
const kernel = new URLSearchParams(location.search).get('kernel') ?? config.kernel ?? 'ts';

/** Both kernels behind one `run(args)`, which resolves to `{ stdout, stderr, code }`. */
const load = async () => {
  if (kernel === 'wasm') {
    const wasm = await fetch('deus_kernel.wasm').then((response) => response.arrayBuffer());
    const deus = await createDeus({ wasm, fs, env });
    return { size: wasm.byteLength, run: (args) => deus.run(image, { args, cwd }) };
  }
  const { runInBrowser } = await import('./kernel-ts.mjs');
  return { size: 0, run: async (args) => runInBrowser(image, { fs, args, env, cwd }) };
};
/** The page's changes to `base` in IndexedDB, keyed by the page's path: each changed file's text, or null if removed. */
const saved = (() => {
  const key = location.pathname;
  const open = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open('deus', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('changes');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const call = async (mode, act) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = act(db.transaction('changes', mode).objectStore('changes'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
  return {
    load: () => call('readonly', (store) => store.get(key)),
    save: (changes) => call('readwrite', (store) => store.put(changes, key)),
    clear: () => call('readwrite', (store) => store.delete(key)),
  };
})();
const changes = () => {
  const out = {};
  for (const [path, text] of fs.files) {
    if (base[path] !== text) {
      out[path] = text;
    }
  }
  for (const path of Object.keys(base)) {
    if (!fs.files.has(path)) {
      out[path] = null;
    }
  }
  return out;
};
// A page without IndexedDB (a private window, blocked storage) still runs, from `base` every time.
const stored = await saved.load().catch(() => undefined);
const restored = stored && Object.keys(stored).length > 0 ? stored : undefined;
for (const [path, text] of Object.entries(restored ?? {})) {
  if (text === null) {
    fs.remove(path);
  } else {
    fs.write(path, text);
  }
}
let saving;
const persist = () => {
  clearTimeout(saving);
  saving = setTimeout(() => saved.save(changes()).catch(() => {}), 300);
};
$('reset').onclick = async () => {
  await saved.clear().catch(() => {});
  location.reload();
};

const deus = await load();
$('status').textContent =
  `${kernel} kernel${deus.size ? ` ${Math.round(deus.size / 1024)} KB` : ''}, image ${Math.round(image.length / 1024)} KB, ` +
  `${fs.files.size} files${restored ? ', restored' : ''}; ready in ${Math.round(performance.now() - started)} ms`;

let current;
const showFiles = () => {
  const list = $('file-list');
  list.replaceChildren(
    ...[...fs.files.keys()]
      .filter((path) => !config.hide?.some((prefix) => path.startsWith(prefix)))
      .sort()
      .map((path) => {
        const item = document.createElement('li');
        item.textContent = path;
        item.title = path;
        item.classList.toggle('active', path === current);
        item.onclick = () => open(path);
        return item;
      }),
  );
};
const open = (path) => {
  current = path;
  $('file-name').textContent = path;
  editor.disabled = false;
  editor.value = fs.read(path) ?? '';
  showFiles();
};
editor.oninput = () => {
  if (current) {
    fs.write(current, editor.value);
    persist();
  }
};
$('new-file').onclick = () => {
  const name = prompt('New file', cwd + '/main.deus');
  if (name) {
    fs.write(fs.normalize(name.startsWith('/') ? name : cwd + '/' + name), '');
    open(fs.normalize(name.startsWith('/') ? name : cwd + '/' + name));
    persist();
  }
};

const history = [];
let position = 0;
const execute = async (line) => {
  print(`$ deus ${line}\n`, 'cmd');
  const begin = performance.now();
  const result = await deus.run(split(line));
  print(result.stdout);
  print(result.stderr, 'err');
  print(`exit ${result.code} · ${Math.round(performance.now() - begin)} ms\n`, 'meta');
  showFiles();
  if (current) {
    editor.value = fs.read(current) ?? '';
  }
  persist();
};

$('prompt').onsubmit = async (event) => {
  event.preventDefault();
  const line = command.value.trim();
  command.value = '';
  if (!line) {
    return;
  }
  history.push(line);
  position = history.length;
  command.disabled = true;
  await execute(line);
  command.disabled = false;
  command.focus();
};
command.onkeydown = (event) => {
  if (event.key === 'ArrowUp' && position > 0) {
    command.value = history[--position];
  }
  if (event.key === 'ArrowDown' && position < history.length) {
    command.value = history[++position] ?? '';
  }
};

showFiles();
if (config.open) {
  open(config.open);
}
// A restored page already ran these; running `init` again would fail on the codebase it made.
for (const line of restored ? [] : (config.run ?? [])) {
  await execute(line);
}
command.disabled = false;
command.focus();
window.deus = { deus, kernel, image, fs, execute };
