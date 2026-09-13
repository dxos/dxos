//
// Copyright 2026 DXOS.org
//

/** Starts each console line {@link installRtcTrace} emits; JSON follows it. */
export const RTC_TRACE_PREFIX = '[dx-rtc-trace]';

type Details = Record<string, unknown>;

type TracedMethod = {
  name: string;
  args?: (pc: RTCPeerConnection, args: unknown[]) => Details;
  result?: (value: unknown) => Details;
};

/**
 * Page init script logging each RTCPeerConnection construction, call phase and event through the console.debug
 * captured at install; self-contained because Playwright serializes it into the page.
 *
 * A call logs `start`, then `ret` when its synchronous part returns a pending promise, then `ok` or `err` once.
 */
export const installRtcTrace = (prefix: string): void => {
  const marker = Symbol.for('dxos.e2e.rtc-trace');
  const Native: typeof RTCPeerConnection | undefined = Reflect.get(globalThis, 'RTCPeerConnection');
  if (typeof Native !== 'function' || Reflect.has(globalThis, marker)) {
    return;
  }
  Object.defineProperty(globalThis, marker, { value: true });

  const debug = console.debug;
  const apply = Reflect.apply;
  const stringify = JSON.stringify;
  const perf = performance;
  const now = perf.now;
  const timeOrigin = perf.timeOrigin;
  const then = Promise.prototype.then;
  const NativePromise = Promise;
  const addEventListener = EventTarget.prototype.addEventListener;

  /** Keyed weakly so tracing never extends a connection's lifetime. */
  const indices = new WeakMap<object, number>();
  let instances = 0;
  let calls = 0;
  /** Orders lines exactly where an engine coarsens `performance.now()` to whole milliseconds. */
  let lines = 0;

  /** `base` holds only the tracer's own primitives; `describe` reads caller values and may throw. */
  const emit = (pc: number, ev: string, base: Details, describe?: () => Details): void => {
    const t = Math.round((timeOrigin + apply(now, perf, [])) * 10) / 10;
    const n = ++lines;
    let text: string;
    try {
      text = stringify({ t, n, pc, ev, ...base, ...(describe ? describe() : {}) });
    } catch (err) {
      // A value the tracer cannot describe is recorded on the line instead of changing the traced call's outcome.
      text = stringify({ t, n, pc, ev, ...base, describeErr: describeError(err) });
    }
    apply(debug, console, [`${prefix} ${text}`]);
  };

  const indexOf = (pc: object): number => {
    let index = indices.get(pc);
    if (index === undefined) {
      index = ++instances;
      indices.set(pc, index);
    }
    return index;
  };

  const field = (value: unknown, key: string): unknown =>
    typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;

  const describeError = (err: unknown): Details =>
    err instanceof Error
      ? { name: err.name, message: err.message }
      : { name: typeof err, message: typeof err === 'string' ? err : typeof err };

  /** Reads a getter that can throw natively, such as Firefox's `remoteDescription` on a closed connection. */
  const attempt = (read: () => unknown): unknown => {
    try {
      return read();
    } catch (err) {
      return { threw: describeError(err).name };
    }
  };

  const count = (sdp: string, pattern: RegExp): number => sdp.match(pattern)?.length ?? 0;

  const describeSdp = (description: object): Details => {
    const sdp = field(description, 'sdp');
    return typeof sdp === 'string'
      ? { type: field(description, 'type'), cands: count(sdp, /^a=candidate:/gm), mlines: count(sdp, /^m=/gm) }
      : { type: field(description, 'type') };
  };

  const describeDescriptionArg = (_: RTCPeerConnection, [description]: unknown[]): Details =>
    typeof description === 'object' && description !== null ? describeSdp(description) : { implicit: true };

  const describeDescriptionResult = (value: unknown): Details =>
    typeof value === 'object' && value !== null ? describeSdp(value) : { result: typeof value };

  const describeCandidate = (candidate: unknown): Details => {
    if (typeof candidate !== 'object' || candidate === null) {
      return { end: true, arg: candidate === null ? 'null' : 'none' };
    }
    const value = field(candidate, 'candidate');
    return {
      candidate: value ?? null,
      sdpMid: field(candidate, 'sdpMid') ?? null,
      sdpMLineIndex: field(candidate, 'sdpMLineIndex') ?? null,
      ...(value ? {} : { end: true }),
    };
  };

  /** Scheme and transport of each ICE server URL; hosts and credentials are dropped. */
  const describeConfig = (config: unknown): Details | null => {
    if (typeof config !== 'object' || config === null) {
      return null;
    }
    const servers = field(config, 'iceServers');
    return {
      iceServers: Array.isArray(servers)
        ? servers.map((server: unknown) => {
            const urls = field(server, 'urls');
            return (Array.isArray(urls) ? urls : [urls]).map((url: unknown) => {
              const match = typeof url === 'string' ? /^([a-z]+):[^?]*(?:\?transport=([a-z]+))?/i.exec(url) : null;
              return match ? [match[1], match[2]].filter(Boolean).join('/') : typeof url;
            });
          })
        : null,
      iceTransportPolicy: field(config, 'iceTransportPolicy') ?? null,
      bundlePolicy: field(config, 'bundlePolicy') ?? null,
      iceCandidatePoolSize: field(config, 'iceCandidatePoolSize') ?? null,
    };
  };

  const methods: TracedMethod[] = [
    { name: 'createOffer', result: describeDescriptionResult },
    { name: 'createAnswer', result: describeDescriptionResult },
    { name: 'setLocalDescription', args: describeDescriptionArg },
    { name: 'setRemoteDescription', args: describeDescriptionArg },
    {
      name: 'addIceCandidate',
      args: (pc, [candidate]) => ({
        ...describeCandidate(candidate),
        remote: attempt(() => pc.remoteDescription?.type ?? null),
      }),
    },
    { name: 'createDataChannel', args: (_, [label]) => ({ label: typeof label === 'string' ? label : typeof label }) },
    { name: 'close' },
    { name: 'restartIce' },
    { name: 'getStats' },
  ];

  const proto = Native.prototype;
  for (const { name, args: describeArgs, result: describeResult } of methods) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    const original: unknown = descriptor?.value;
    if (!descriptor || typeof original !== 'function') {
      continue;
    }

    // A method definition, like a native method, has no `prototype`.
    const wrapper = {
      [name](this: unknown, ...args: unknown[]): unknown {
        const pc = this instanceof Native ? this : undefined;
        const index = pc ? indexOf(pc) : 0;
        const call = ++calls;
        emit(index, name, { ph: 'start', call }, () => ({
          sig: pc?.signalingState ?? null,
          ...(pc && describeArgs ? describeArgs(pc, args) : {}),
        }));

        let result: unknown;
        try {
          result = apply(original, this, args);
        } catch (err) {
          emit(index, name, { ph: 'err', call }, () => describeError(err));
          throw err;
        }

        if (!(result instanceof NativePromise)) {
          emit(index, name, { ph: 'ok', call });
          return result;
        }

        emit(index, name, { ph: 'ret', call });
        // The caller gets the derived promise, so a rejection it leaves unhandled is still reported.
        return apply(then, result, [
          (value: unknown) => {
            emit(index, name, { ph: 'ok', call }, describeResult && (() => describeResult(value)));
            return value;
          },
          (err: unknown) => {
            emit(index, name, { ph: 'err', call }, () => describeError(err));
            throw err;
          },
        ]);
      },
    }[name];
    Object.defineProperty(wrapper, 'length', { value: original.length });
    Object.defineProperty(proto, name, { ...descriptor, value: wrapper });
  }

  const stateListener = (ev: string, state: (pc: RTCPeerConnection) => string) =>
    function (this: RTCPeerConnection): void {
      emit(indexOf(this), ev, {}, () => ({ state: state(this) }));
    };

  // Shared by every instance; each reads its connection from `this`.
  const listeners: [string, (this: RTCPeerConnection, event: Event) => void][] = [
    [
      'icecandidate',
      function (event) {
        emit(indexOf(this), 'icecandidate', {}, () => {
          const candidate = field(event, 'candidate');
          return { candidate: candidate ? (field(candidate, 'candidate') ?? null) : null };
        });
      },
    ],
    [
      'icecandidateerror',
      function (event) {
        emit(indexOf(this), 'icecandidateerror', {}, () => ({
          url: field(event, 'url') ?? null,
          errorCode: field(event, 'errorCode') ?? null,
          errorText: field(event, 'errorText') ?? null,
          address: field(event, 'address') ?? null,
          port: field(event, 'port') ?? null,
        }));
      },
    ],
    ['icegatheringstatechange', stateListener('icegatheringstatechange', (pc) => pc.iceGatheringState)],
    ['iceconnectionstatechange', stateListener('iceconnectionstatechange', (pc) => pc.iceConnectionState)],
    ['connectionstatechange', stateListener('connectionstatechange', (pc) => pc.connectionState)],
    ['signalingstatechange', stateListener('signalingstatechange', (pc) => pc.signalingState)],
    [
      'negotiationneeded',
      function () {
        emit(indexOf(this), 'negotiationneeded', {});
      },
    ],
    [
      'datachannel',
      function (event) {
        emit(indexOf(this), 'datachannel', {}, () => ({ label: field(field(event, 'channel'), 'label') ?? null }));
      },
    ],
  ];

  // A Proxy keeps the native prototype, statics and name, which a subclass would replace.
  const Traced = new Proxy(Native, {
    construct: (target, args, newTarget) => {
      const index = ++instances;
      emit(index, 'construct', { ph: 'start' }, () => ({ config: describeConfig(args[0]) }));
      let pc: RTCPeerConnection;
      try {
        pc = Reflect.construct(target, args, newTarget);
      } catch (err) {
        emit(index, 'construct', { ph: 'err' }, () => describeError(err));
        throw err;
      }
      indices.set(pc, index);
      for (const [type, listener] of listeners) {
        apply(addEventListener, pc, [type, listener]);
      }
      emit(index, 'construct', { ph: 'ok' });
      return pc;
    },
  });

  const replace = (target: object, key: string): void => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor && 'value' in descriptor) {
      Object.defineProperty(target, key, { ...descriptor, value: Traced });
    } else {
      Reflect.set(target, key, Traced);
    }
  };
  replace(proto, 'constructor');
  if (Reflect.get(globalThis, 'webkitRTCPeerConnection') === Native) {
    replace(globalThis, 'webkitRTCPeerConnection');
  }
  replace(globalThis, 'RTCPeerConnection');
};
