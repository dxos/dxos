import type { Prompt } from '@effect/ai';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

/**
 * Carries context of the current session.
 * Includes access to history of the session.
 */
export class SessionContext extends Context.Tag('@dxos/assistant/SessionContext')<
  SessionContext,
  SessionContext.Service
>() {
  static historyPrompt: Effect.Effect<Prompt.Prompt, never, SessionContext> = SessionContext.pipe(
    Effect.flatMap((_) => _.historyPrompt),
  );
}

export namespace SessionContext {
  export type Service = {
    historyPrompt: Effect.Effect<Prompt.Prompt>;
  };
}
