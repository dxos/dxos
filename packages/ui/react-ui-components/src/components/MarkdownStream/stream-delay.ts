//
// Copyright 2025 DXOS.org
//

import { type Duration, Effect, Stream } from 'effect';

export const streamDelay =
  ({ delay }: { delay: Duration.DurationInput }) =>
  (source: Stream.Stream<string>): Stream.Stream<string> => {
    return Stream.asyncPush(
      Effect.fnUntraced(function* (emit) {
        let text = '';

        yield* Stream.runForEach(
          source,
          Effect.fnUntraced(function* (chunk) {
            console.log('chunk', { chunk });
            text += chunk;

            let i = 0;
            while (i < text.length) {
              // Check if at the start of an XML tag.
              // if (text[i] === '<' && i + 1 < text.length && text[i + 1] !== '/') {
              //   const xmlBlock = extractXmlBlock(text, i);
              //   if (xmlBlock) {
              //     emit.single(xmlBlock);
              //     i += xmlBlock.length;
              //     // yield* Effect.sleep(delay);
              //     continue;
              //   }
              // }

              // NotM an XML block, yield single character.
              const str = text[i++];
              emit.single(str);
              console.log(str);

              // yield* Effect.sleep(delay);
            }
            text = text.slice(i);

            console.log('chunk done', { text });
          }),
        );

        console.log('end');
        emit.end();
      }),
    );
  };
