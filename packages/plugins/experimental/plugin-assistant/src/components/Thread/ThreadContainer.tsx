//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, type FC } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Filter, getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { getDXN, getLabel, getSchema } from '@dxos/echo-schema';
import { useChatProcessor, useMessageQueue } from '../../hooks';
import { type AIChatType, type AssistantSettingsProps } from '../../types';
import { Thread, type ContextProvider, type ThreadProps } from './Thread';
import { DocumentSchema, DocumentType } from '@dxos/plugin-markdown/types';

export type ThreadContainerProps = {
  chat?: AIChatType;
  settings?: AssistantSettingsProps;
} & Pick<ThreadProps, 'debug' | 'transcription' | 'onOpenChange'>;

// TODO(burdon): Since this only wraps Thread, just separate out hook?
export const ThreadContainer: FC<ThemedClassName<ThreadContainerProps>> = ({
  classNames,
  chat,
  settings,
  onOpenChange,
  ...props
}) => {
  // Push up capabilities hooks out of components.
  const space = getSpace(chat);

  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const contextProvider = useMemo<ContextProvider | undefined>((): ContextProvider | undefined => {
    if (!space) {
      return undefined;
    }

    return {
      async query({ query }) {
        const artifactSchemas = artifactDefinitions.map((artifact) => artifact.schema);
        const { objects } = await space.db
          .query(Filter.or(...artifactSchemas.map((schema) => Filter.schema(schema))))
          .run();
        return objects
          .map((object) => {
            log.info('object', { object, label: getLabel(getSchema(object)!, object) });
            return object;
          })
          .filter((object) => stringMatch(query, getLabel(getSchema(object)!, object) ?? ''))
          .filter((object) => !!getDXN(object))
          .map((object) => ({
            uri: getDXN(object)!.toString(),
            label: getLabel(getSchema(object)!, object) ?? '',
          }));
      },
      async resolveMetadata({ uri }) {
        const object = await space.db.query({ id: uri }).first();
        return {
          uri,
          label: getLabel(getSchema(object)!, object) ?? '',
        };
      },
    };
  }, [space, artifactDefinitions]);

  const processor = useChatProcessor(space, settings);
  const messageQueue = useMessageQueue(chat);
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  const handleSubmit = useCallback(
    (text: string) => {
      // Don't accept input if still processing.
      if (processor.streaming.value) {
        log.warn('ignoring submit; still processing.');
        return false;
      }

      onOpenChange?.(true);

      invariant(messageQueue);
      void processor.request(text, {
        history: messageQueue.items,
        onComplete: (messages) => {
          messageQueue.append(messages);
        },
      });

      return true;
    },
    [processor, messageQueue, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  return (
    <Thread
      classNames={classNames}
      space={space}
      messages={messages}
      processing={processor.streaming.value}
      error={processor.error.value}
      tools={processor.tools}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onPrompt={handleSubmit}
      onOpenChange={onOpenChange}
      contextProvider={contextProvider}
      {...props}
    />
  );
};

const stringMatch = (query: string, label: string) => label.toLowerCase().startsWith(query.toLowerCase());
