//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { ServiceResolver } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { assistant, type AssistantOptions } from '@dxos/react-ui-editor';
import { type Message } from '@dxos/types';

import { EditMessage } from '#components';

import { type EditMessageProps } from '../../components/EditMessage/EditMessage';
import { email } from '../../extensions';
import { GmailFunctions } from '../../operations/google/gmail';
import { stripQuotedMessage } from '../../util';

export type EditMessageArticleProps = AppSurface.ObjectArticleProps<Message.Message>;

export const EditMessageArticle = ({ role, subject }: EditMessageArticleProps) => {
  const db = Obj.getDatabase(subject);
  const runtime = useProcessManagerRuntime();
  const spaceId = db?.spaceId;

  const extensions = useMemo(() => {
    if (!spaceId) {
      return [];
    }

    const spaceLayer = ServiceResolver.provide({ space: spaceId }, AiService.AiService);
    const generate: AssistantOptions['generate'] = ({ instructions, content }) =>
      runtime.runPromise(
        Effect.gen(function* () {
          const prompt = [instructions, stripQuotedMessage(content)].join('\n\n');
          const response = yield* LanguageModel.generateText({ prompt });
          return response.text;
        }).pipe(
          Effect.provide(AiService.model('@anthropic/claude-haiku-4-5').pipe(Layer.orDie)),
          Effect.provide(spaceLayer),
        ) as Effect.Effect<string, any, any>,
      );

    return [assistant({ generate }), email()];
  }, [runtime, spaceId]);

  const handleSend = useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (message) => {
      await runtime.runPromise(Operation.invoke(GmailFunctions.Send, { message }));
    },
    [runtime],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <EditMessage message={subject} extensions={extensions} onSend={handleSend} />
      </Panel.Content>
    </Panel.Root>
  );
};
