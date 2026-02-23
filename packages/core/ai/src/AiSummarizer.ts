import { Message } from '@dxos/types';
import { trim } from '@dxos/util';
import { LanguageModel, Prompt, type AiError } from '@effect/ai';
import { Effect } from 'effect';
import * as AiPreprocessor from './AiPreprocessor';
import { Obj } from '@dxos/echo';
import type { PromptPreprocessingError } from './errors';
import { dbg } from '@dxos/log';

export interface SummarizeOptions {
  instructions?: string;
}

export const summarize: (
  messages: readonly Message.Message[],
  opts?: SummarizeOptions,
) => Effect.Effect<Message.Message, AiError.AiError | PromptPreprocessingError, LanguageModel.LanguageModel> =
  Effect.fn('AiSummarizer.summarize')(function* (messages, { instructions = DEFAULT_INSTRUCTIONS } = {}) {
    let prompt = yield* AiPreprocessor.preprocessPrompt(messages, { system: instructions, cacheControl: 'no-cache' });

    // Last turn must be a user message for summarization to work.
    // Repeating the instructions to ensure the model sees them, otherwise the model tends to forget them.
    prompt = prompt.pipe(Prompt.merge(instructions));

    const response = yield* LanguageModel.generateText({
      prompt,
    });

    return Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { role: 'assistant' },
      blocks: [{ _tag: 'summary', content: response.text }],
    });
  });

export const DEFAULT_INSTRUCTIONS = trim`
  <instructions>
    You are an agent that summarizes conversations.
    You will be given a conversation and you will need to summarize it to compact context.
    Your summary will be used by AI model to continue the conversation without seeing the original messages.
    Remove unnecessary details and focus on the most important information.
    Keep user requests, method of action, and progress.
    Keep the important objects and references in original format.
    It is very important you maintain unchanged ECHO DXNs and IDs of the objects.
    Output only the summary.
  </instructions>

  <example_output>
    Processing a flight booking confirmation email. The user requested a round-trip flight from Warsaw to Barcelona for March 15–22, 2026.

    Action taken:
    - Found existing booking object \`dxn:echo:@:01KHZWKQ9HPJYG147HV7CP5ARX\` (type \`dxn:echo:@:01KHXAMH4F3V94RCYC7P7M2H0C\` / \`example.com/type/FlightBooking\`) matching confirmation code ABC123.
    - Updated the booking status from "pending" to "confirmed".
    - Added flight details: Outbound WAW→BCN Mar 15 08:30, Return BCN→WAW Mar 22 14:15, carrier LOT Polish Airlines.
    - Stored passenger info and seat assignments in notes.

    Booking details preserved: Confirmation ABC123, total 1,240 PLN, booked 2026-02-18, airline LOT Polish Airlines, flight numbers LO391/LO392.

    Status enum mapping for the booking schema: pending=Awaiting payment, confirmed=Booked, cancelled=Cancelled, completed=Flown.
  </example_output>

  TASK: Reply with the summary of the prior conversation.
`;
