import { StreamTransform, type StreamBlock } from '@dxos/ai';
import type { MessageContentBlock, TextContentBlock } from '@dxos/schema';
import type { AiError, AiResponse } from '@effect/ai';
import { Effect, Function, Stream } from 'effect';

export interface ParseGptStreamOptions {
  onPart?: (part: AiResponse.Part) => Effect.Effect<void>;
}

/**
 * Parses the part stream into a set of complete message blocks.
 * Each block emitted is final.
 *
 * Callbacks can be provided to watch for incomplete blocks.
 */
export const parseGptStream =
  ({ onPart = Function.constant(Effect.void) }: ParseGptStreamOptions) =>
  <E>(input: Stream.Stream<AiResponse.AiResponse, E, never>): Stream.Stream<MessageContentBlock, E, never> =>
    Stream.asyncPush(
      Effect.fnUntraced(function* (emit) {
        const transformer = new StreamTransform();
        /**
         * Current content message block.
         */
        let contentBlock: MessageContentBlock | undefined;

        /**
         * Current partial block used to accumulate content.
         */
        let streamBlock: StreamBlock | undefined;
        const stack: StreamBlock[] = [];

        yield* Stream.runForEach(
          input,
          Effect.fnUntraced(function* (response) {
            for (const part of response.parts) {
              yield* onPart(part);
              switch (part._tag) {
                case 'TextPart':
                  emit.single({
                    type: 'text',
                    text: part.text,
                  } satisfies TextContentBlock);
                  break;
              }
            }
          }),
        );
      }),
    );
