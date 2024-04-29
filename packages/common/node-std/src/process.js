//
// Copyright 2023 DXOS.org
//

// !!! Duplicated in @dxos/esbuild-plugins
// TODO(dmaretskyi): Unify.

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

/* eslint-disable */

function nextTick(fun, ...args) {
  if (args.length > 0) {
    queueMicrotask(() => fun(...args));
  } else {
    queueMicrotask(fun);
  }
}

const title = 'browser';
const platform = 'browser';
const browser = true;
const env = {};
const argv = [];
const version = ''; // empty string to avoid regexp issues
const versions = {};
const release = {};
const config = {};

function noop() {}

const on = noop;
const addListener = noop;
const once = noop;
const off = noop;
const removeListener = noop;
const removeAllListeners = noop;
const emit = noop;

function binding(name) {
  throw new Error('process.binding is not supported');
}

function cwd() {
  return '/';
}

function chdir(dir) {
  throw new Error('process.chdir is not supported');
}

function umask() {
  return 0;
}

// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance = globalThis.performance || {};
var performanceNow =
  performance.now ||
  performance.mozNow ||
  performance.msNow ||
  performance.oNow ||
  performance.webkitNow ||
  function () {
    return new Date().getTime();
  };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp) {
  var clocktime = performanceNow.call(performance) * 1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime % 1) * 1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds, nanoseconds];
}

hrtime.bigint = function () {
  var clocktime = performanceNow.call(performance) * 1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime % 1) * 1e9);
  return BigInt(seconds * 1e9) + BigInt(nanoseconds);
};

var startTime = new Date();

function uptime() {
  var currentTime = new Date();
  var dif = currentTime - startTime;
  return dif / 1000;
}

export var process = {
  nextTick: nextTick,
  title: title,
  browser: browser,
  env: env,
  argv: argv,
  version: version,
  versions: versions,
  on: on,
  addListener: addListener,
  once: once,
  off: off,
  removeListener: removeListener,
  removeAllListeners: removeAllListeners,
  emit: emit,
  binding: binding,
  cwd: cwd,
  chdir: chdir,
  umask: umask,
  hrtime: hrtime,
  platform: platform,
  release: release,
  config: config,
  uptime: uptime,
};

// replace process.env.VAR with define

const defines = {};
Object.keys(defines).forEach((key) => {
  const segs = key.split('.');
  let target = process;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (i === segs.length - 1) {
      target[seg] = defines[key];
    } else {
      target = target[seg] || (target[seg] = {});
    }
  }
});
