//
// Copyright 2023 DXOS.org
//

import { ChatCompletionRequestMessage } from 'openai';

import { Space } from '@dxos/client';
import { Text } from '@dxos/echo-schema';
import { Contact, Document, DocumentStack } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { ChatModel } from '../chat-model';

// TODO(burdon): Convert to class.
export const updateStack = async (chatModel: ChatModel, space: Space, stack: DocumentStack) => {
  const contact = space.db.getObjectById<Contact>(stack.subjectId)!;
  // TODO(burdon): Note: Just adding `contact` as the second arg returns an empty string.
  log.info('contact', { contact });
  if (!contact || !contact.employer) {
    return;
  }

  const employer = contact.employer!.name;
  const name = contact.name;

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: 'user',
      content: `${employer} is a company`
    },
    {
      role: 'user',
      content: `${name} works for ${employer}`
    },
    {
      role: 'user',
      content: `write a short bio about ${name}`
    }
  ];

  log.info('request', { messages });
  const { content } = (await chatModel?.request(messages)) ?? {};
  if (content) {
    log.info('response', { content });
    // TODO(burdon): Update kai testing to use this.
    stack.sections.push(new Document({ content: new Text(content) }));
  }
};
