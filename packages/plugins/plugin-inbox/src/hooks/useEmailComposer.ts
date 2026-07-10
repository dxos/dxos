//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useCallback, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { ServiceResolver } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { type AssistantOptions, assistant } from '@dxos/react-ui-editor';
import { type Message } from '@dxos/types';

import { type EditMessageProps } from '#components';

import { email } from '../extensions';
import { GmailFunctions } from '../operations/google/gmail';
import { stripQuotedMessage } from '../util';

/**
 * Composer wiring (AI draft-assist + email-aware editor extensions, and send) shared by the
 * full-screen composer ({@link EditMessageArticle}) and the inline thread-reply composer.
 */
export const useEmailComposer = (message: Message.Message): Pick<EditMessageProps, 'extensions' | 'onSend'> => {
  const db = Obj.getDatabase(message);
  const runtime = useProcessManagerRuntime();
  const spaceId = db?.spaceId;

  const extensions = useMemo(() => {
    if (!spaceId) {
      return [];
    }

    const generate: AssistantOptions['generate'] = ({ instructions, content }) =>
      runtime.runPromise(
        Effect.gen(function* () {
          const prompt = [instructions, stripQuotedMessage(content)].join('\n\n');
          const response = yield* LanguageModel.generateText({ prompt });
          return response.text;
        }).pipe(
          Effect.provide(
            AiService.model('com.anthropic.model.claude-haiku-4-5.default').pipe(
              Layer.orDie,
              Layer.provide(ServiceResolver.provide({ space: spaceId }, AiService.AiService)),
            ),
          ),
        ),
      );

    return [assistant({ generate }), email()];
  }, [runtime, spaceId]);

  const handleSend = useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (draft) => {
      if (!spaceId) {
        throw new TypeError('Space not available.');
      }

      const { id } = await runtime.runPromise(
        Operation.invoke(GmailFunctions.Send, { message: draft }, { spaceId }).pipe(
          Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service)),
        ),
      );

      // Lock the draft from further edits; the sync reconciliation stage removes it once the
      // canonical copy — matched by this provider message id — lands in the feed.
      Obj.update(draft, (draft) => {
        const properties = (draft.properties ??= {});
        properties.sentMessageId = id;
        properties.sentAt = new Date().toISOString();
      });
    },
    [runtime, spaceId],
  );

  return { extensions, onSend: handleSend };
};
