//
// Copyright 2026 DXOS.org
//

export interface Transport {
  send: (line: string) => void;
  close: () => void;
  onLine: (cb: (line: string) => void) => void;
  onOpen: (cb: () => void) => void;
  onClose: (cb: () => void) => void;
}

/**
 * WebSocket transport for the freeq wire protocol. freeq sends one IRC line
 * per WebSocket frame with no trailing terminator, so each message is split
 * on any `\r?\n` it happens to contain (handling the rare batched frame or a
 * stray terminator) with no cross-frame buffering. Outbound lines are sent
 * as-is, matching freeq's own client, which appends no terminator either.
 */
export const makeWebSocketTransport = (url: string, ctor: typeof WebSocket = WebSocket): Transport => {
  const socket = new ctor(url);
  let lineCb: (line: string) => void = () => {};
  let openCb: () => void = () => {};
  let closeCb: () => void = () => {};

  socket.addEventListener('open', () => openCb());
  socket.addEventListener('close', () => closeCb());
  socket.addEventListener('message', (event) => {
    const data = typeof event.data === 'string' ? event.data : '';
    for (const line of data.split(/\r?\n/)) {
      if (line.length > 0) {
        lineCb(line);
      }
    }
  });

  return {
    send: (line) => socket.send(line),
    close: () => socket.close(),
    onLine: (cb) => (lineCb = cb),
    onOpen: (cb) => (openCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
};
