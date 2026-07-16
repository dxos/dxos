//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useMemo } from 'react';

import { AiService } from '@dxos/ai';
import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { ServiceResolver } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { type Message } from '@dxos/types';
import { type AssistantOptions, assistant } from '@dxos/ui-editor';

import { type EditMessageProps } from '#components';

import { email } from '../extensions';
import { stripQuotedMessage } from '../util';

/**
 * The email-aware editor extensions (AI draft-assist + email formatting) for the composer, shared by
 * the full-screen composer ({@link EditMessageArticle}) and the inline thread-reply composer.
 */
export const useEmailComposerExtensions = (message: Message.Message): EditMessageProps['extensions'] => {
  const db = Obj.getDatabase(message);
  const runtime = useProcessManagerRuntime();
  const spaceId = db?.spaceId;

  return useMemo(() => {
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
};
