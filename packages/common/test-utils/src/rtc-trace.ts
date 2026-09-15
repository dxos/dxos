//
// Copyright 2026 DXOS.org
//

/** Starts each console line {@link installRtcTrace} emits; JSON follows it. */
export const RTC_TRACE_PREFIX = '[dx-rtc-trace]';

type Details = Record<string, unknown>;

/** The SDP of a description argument, read once when the call starts. */
type Captured = { sdp?: string };

/** Emits one line for the call being traced; `base` holds only the tracer's own primitives. */
type Log = (base: Details, describe?: () => Details) => void;

type TracedMethod = {
  name: string;
  args?: (pc: RTCPeerConnection, args: unknown[], captured: Captured) => Details;
  result?: (value: unknown) => Details;
  /** Re-parses a description the call rejected as unparseable. */
  reparse?: boolean;
  /** Receives a synchronous result. */
  returned?: (pc: number, value: unknown) => void;
};

/**
 * Page init script logging each RTCPeerConnection construction, call phase and event through the console.debug
 * captured at install; self-contained because Playwright serializes it into the page.
 *
 * A call logs `start`, then `ret` when its synchronous part returns a pending promise, then `ok` or `err` once; a remote
 * description WebKit rejects as unparseable then logs `reparse` lines carrying the failing call's `call`. Each data
 * channel logs its state events and its first sends and messages, observed ahead of the app's own handlers.
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
  const NativeDOMException = DOMException;
  const addEventListener = EventTarget.prototype.addEventListener;
  const schedule = setTimeout;
  const encoder = new TextEncoder();
  const proto = Native.prototype;
  // Captured before wrapping, so a re-parse connection is never traced.
  const nativeSetRemoteDescription = proto.setRemoteDescription;
  const nativeClose = proto.close;
  const NativeDataChannel: typeof RTCDataChannel | undefined = Reflect.get(globalThis, 'RTCDataChannel');

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

  /** UTF-16 length, UTF-8 length and FNV-1a-32 of the UTF-8 bytes, and each `m=` line verbatim up to its `\n`. */
  const describeSdpText = (sdp: string): Details => {
    const bytes = encoder.encode(sdp);
    let hash = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      hash = Math.imul(hash ^ bytes[i], 0x01000193);
    }
    return {
      units: sdp.length,
      bytes: bytes.length,
      fnv1a: (hash >>> 0).toString(16).padStart(8, '0'),
      mText: sdp.match(/^m=[^\n]*/gm) ?? [],
    };
  };

  const describeSdp = (description: object, captured?: Captured): Details => {
    const type = field(description, 'type');
    const sdp = field(description, 'sdp');
    if (typeof sdp !== 'string') {
      return { type };
    }
    if (captured) {
      captured.sdp = sdp;
    }
    return { type, cands: count(sdp, /^a=candidate:/gm), mlines: count(sdp, /^m=/gm), ...describeSdpText(sdp) };
  };

  const describeDescriptionArg = (_: RTCPeerConnection, [description]: unknown[], captured: Captured): Details =>
    typeof description === 'object' && description !== null ? describeSdp(description, captured) : { implicit: true };

  const describeDescriptionResult = (value: unknown): Details =>
    typeof value === 'object' && value !== null ? describeSdp(value) : { result: typeof value };

  /** A copy with its own backing store, which `slice(0)` does not give: engines return the whole string itself. */
  const rebuild = (text: string): string => {
    const units: string[] = [];
    for (let i = 0; i < text.length; i++) {
      units.push(String.fromCharCode(text.charCodeAt(i)));
    }
    return units.join('');
  };

  /** WebKit parses an answer before checking state, so on a stable connection only a parseable one is InvalidStateError. */
  const parseOutcome = (err: unknown): string => {
    const { name } = describeError(err);
    return name === 'SyntaxError' ? 'unparsed' : name === 'InvalidStateError' ? 'parsed' : 'err';
  };

  /** Parses each copy in turn as an answer on the stable `probe`, logging each outcome before `probe` closes. */
  const parseCopies = (log: Log, probe: RTCPeerConnection, sdp: string, copies: string[]): void => {
    const [copy, ...rest] = copies;
    if (copy === undefined) {
      try {
        apply(nativeClose, probe, []);
      } catch (err) {
        log({ outcome: 'closeErr' }, () => describeError(err));
      }
      return;
    }
    let text = sdp;
    const settle = (base: Details, describe?: () => Details): void => {
      log({ copy, ...base }, () => ({ ...(describe ? describe() : {}), ...describeSdpText(text) }));
      parseCopies(log, probe, sdp, rest);
    };
    try {
      if (copy === 'rebuilt') {
        text = rebuild(sdp);
      }
      void apply(then, apply(nativeSetRemoteDescription, probe, [{ type: 'answer', sdp: text }]), [
        () => settle({ outcome: 'applied' }),
        (err: unknown) => settle({ outcome: parseOutcome(err) }, () => describeError(err)),
      ]);
    } catch (err) {
      settle({ outcome: 'diagErr' }, () => describeError(err));
    }
  };

  /** Re-parses on one connection the app never sees, which an answer in stable state leaves unapplied. */
  const reparseCopies = (log: Log, sdp: string): void => {
    let probe: RTCPeerConnection;
    try {
      probe = new Native();
    } catch (err) {
      log({ outcome: 'diagErr' }, () => describeError(err));
      return;
    }
    parseCopies(log, probe, sdp, ['same', 'rebuilt']);
  };

  /** Runs one task after WebKit's parse rejection, past any microtask handling of it by the app. */
  const scheduleReparse = (log: Log, { sdp }: Captured, err: unknown): void => {
    try {
      if (sdp !== undefined && err instanceof NativeDOMException && err.name === 'SyntaxError') {
        apply(schedule, globalThis, [() => reparseCopies(log, sdp), 0]);
      }
    } catch (diagErr) {
      log({ outcome: 'diagErr' }, () => describeError(diagErr));
    }
  };

  /** Frames logged per data channel in each direction. */
  const DATA_CHANNEL_FRAMES = 8;
  /** Keyed weakly, like `indices`. */
  const dataChannels = new WeakMap<object, { dc: number; sent: number; received: number }>();
  let dataChannelCount = 0;

  const frameSize = (data: unknown): Details =>
    typeof data === 'string'
      ? { chars: data.length }
      : { bytes: field(data, 'byteLength') ?? field(data, 'size') ?? null, kind: typeof data };

  /** Listens from the channel's creation or announcement, so a frame dispatched before the app attaches is still seen. */
  const traceDataChannel = (pc: number, channel: unknown): void => {
    if (!NativeDataChannel || !(channel instanceof NativeDataChannel) || dataChannels.has(channel)) {
      return;
    }
    const traced = { dc: ++dataChannelCount, sent: 0, received: 0 };
    dataChannels.set(channel, traced);
    for (const type of ['open', 'closing', 'close', 'error', 'bufferedamountlow']) {
      apply(addEventListener, channel, [
        type,
        () => emit(pc, `dc.${type}`, { dc: traced.dc }, () => ({ label: channel.label, state: channel.readyState })),
      ]);
    }
    apply(addEventListener, channel, [
      'message',
      (event: MessageEvent) => {
        if (traced.received++ < DATA_CHANNEL_FRAMES) {
          emit(pc, 'dc.message', { dc: traced.dc, seq: traced.received }, () => ({
            state: channel.readyState,
            ...frameSize(field(event, 'data')),
          }));
        }
      },
    ]);
  };

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
    { name: 'setRemoteDescription', args: describeDescriptionArg, reparse: true },
    {
      name: 'addIceCandidate',
      args: (pc, [candidate]) => ({
        ...describeCandidate(candidate),
        remote: attempt(() => pc.remoteDescription?.type ?? null),
      }),
    },
    {
      name: 'createDataChannel',
      args: (_, [label]) => ({ label: typeof label === 'string' ? label : typeof label }),
      returned: traceDataChannel,
    },
    { name: 'close' },
    { name: 'restartIce' },
    { name: 'getStats' },
  ];

  for (const { name, args: describeArgs, result: describeResult, reparse, returned } of methods) {
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
        const captured: Captured = {};
        emit(index, name, { ph: 'start', call }, () => ({
          sig: pc?.signalingState ?? null,
          ...(pc && describeArgs ? describeArgs(pc, args, captured) : {}),
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
          returned?.(index, result);
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
            if (reparse) {
              scheduleReparse(
                (base, describe) => emit(index, name, { ph: 'reparse', call, ...base }, describe),
                captured,
                err,
              );
            }
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
        traceDataChannel(indexOf(this), field(event, 'channel'));
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
  const send = NativeDataChannel ? Object.getOwnPropertyDescriptor(NativeDataChannel.prototype, 'send') : undefined;
  if (NativeDataChannel && send && typeof send.value === 'function') {
    const original: (...args: unknown[]) => unknown = send.value;
    const wrapper = {
      send(this: unknown, ...args: unknown[]): unknown {
        const traced = typeof this === 'object' && this !== null ? dataChannels.get(this) : undefined;
        if (traced && traced.sent++ < DATA_CHANNEL_FRAMES) {
          emit(0, 'dc.send', { dc: traced.dc, seq: traced.sent }, () => ({
            state: field(this, 'readyState'),
            ...frameSize(args[0]),
          }));
        }
        return apply(original, this, args);
      },
    }.send;
    Object.defineProperty(wrapper, 'length', { value: original.length });
    Object.defineProperty(NativeDataChannel.prototype, 'send', { ...send, value: wrapper });
  }

  replace(proto, 'constructor');
  if (Reflect.get(globalThis, 'webkitRTCPeerConnection') === Native) {
    replace(globalThis, 'webkitRTCPeerConnection');
  }
  replace(globalThis, 'RTCPeerConnection');
};
