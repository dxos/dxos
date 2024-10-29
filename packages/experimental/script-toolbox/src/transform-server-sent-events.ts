//
// Copyright 2024 DXOS.org
//

/**
 * Converts a binary stream in server-sent events format to a stream of it's text content.
 */
export const transformServerSentEvents = (input: ReadableStream): ReadableStream => {
  const { readable, writable } = new TransformStream({
    transform: (chunk, controller) => {
      const line = textDecoder.decode(chunk);
      if (!line.startsWith(DATA_PREFIX)) {
        controller.enqueue(textEncoder.encode(JSON.parse(line.slice(DATA_PREFIX.length)).response));
      }
    },
  });
  void input.pipeTo(writable);
  return readable;
};

const DATA_PREFIX = 'data: ';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
