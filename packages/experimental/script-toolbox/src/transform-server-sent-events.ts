/**
 * Converts a binary stream in server-sent events format to a stream of it's text content.
 */
//
// Copyright 2024 DXOS.org
//

export const transformServerSentEvents = (input: ReadableStream): ReadableStream => {
  const { readable, writable } = new TransformStream({
    transform: (chunk, controller) => {
      controller.enqueue(
        new TextEncoder().encode(JSON.parse(textDecoder.decode(chunk).slice('data: '.length)).response),
      );
    },
  });
  void input.pipeTo(writable);
  return readable;
};

const textDecoder = new TextDecoder();
