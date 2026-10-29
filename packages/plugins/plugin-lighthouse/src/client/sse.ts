//
// Copyright 2026 DXOS.org
//

/** One server-sent event. */
export type SseMessage = { event: string; data: string; id?: string };

/**
 * An incremental Server-Sent Events parser. The stream is read over `fetch` rather than `EventSource` because the
 * lighthouse API needs an `Authorization` header and a `Last-Event-ID` on reconnect, which `EventSource` cannot send.
 */
export const createSseParser = (onMessage: (message: SseMessage) => void) => {
  let buffer = '';
  let event = '';
  let data: string[] = [];
  let id: string | undefined;

  const dispatch = () => {
    if (data.length > 0) {
      onMessage({ event: event || 'message', data: data.join('\n'), ...(id !== undefined ? { id } : {}) });
    }
    event = '';
    data = [];
  };

  const line = (text: string) => {
    if (text === '') {
      dispatch();
      return;
    }
    if (text.startsWith(':')) {
      return;
    }
    const colon = text.indexOf(':');
    const field = colon < 0 ? text : text.slice(0, colon);
    const value = colon < 0 ? '' : text.slice(colon + 1).replace(/^ /, '');
    switch (field) {
      case 'event':
        event = value;
        break;
      case 'data':
        data.push(value);
        break;
      case 'id':
        id = value;
        break;
    }
  };

  return {
    /** Feeds a decoded chunk; complete lines are parsed, a partial line waits for the next chunk. */
    push: (chunk: string) => {
      buffer += chunk;
      let newline = buffer.search(/\r\n|\n|\r/);
      while (newline >= 0) {
        const width = buffer.startsWith('\r\n', newline) ? 2 : 1;
        line(buffer.slice(0, newline));
        buffer = buffer.slice(newline + width);
        newline = buffer.search(/\r\n|\n|\r/);
      }
    },
    /** The id of the last event that carried one; a reconnect sends it as `Last-Event-ID`. */
    get lastEventId() {
      return id;
    },
  };
};
