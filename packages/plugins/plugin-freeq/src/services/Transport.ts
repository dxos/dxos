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
 * WebSocket transport that frames IRC lines on `\r\n`. Outbound lines get a
 * trailing `\r\n`; inbound data is buffered and split on `\r\n` so a partial
 * frame is not delivered as a line.
 */
export const makeWebSocketTransport = (url: string, ctor: typeof WebSocket = WebSocket): Transport => {
  const socket = new ctor(url);
  let lineCb: (line: string) => void = () => {};
  let openCb: () => void = () => {};
  let closeCb: () => void = () => {};
  let buffer = '';

  socket.addEventListener('open', () => openCb());
  socket.addEventListener('close', () => closeCb());
  socket.addEventListener('message', (event) => {
    buffer += typeof event.data === 'string' ? event.data : '';
    let index = buffer.indexOf('\r\n');
    while (index !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (line.length > 0) {
        lineCb(line);
      }
      index = buffer.indexOf('\r\n');
    }
  });

  return {
    send: (line) => socket.send(line + '\r\n'),
    close: () => socket.close(),
    onLine: (cb) => (lineCb = cb),
    onOpen: (cb) => (openCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
};
