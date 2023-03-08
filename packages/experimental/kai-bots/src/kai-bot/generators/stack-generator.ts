//
// Copyright 2023 DXOS.org
//

import startCase from 'lodash.startcase';
import { ChatCompletionRequestMessage } from 'openai';

import { Space } from '@dxos/client';
import { Text } from '@dxos/echo-schema';
import { Contact, Document, DocumentStack } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { ChatModel } from '../chat-model';
import { Generator } from '../generator';

export class ContactStackGenerator implements Generator<DocumentStack> {
  async update(chatModel: ChatModel, space: Space, stack: DocumentStack) {
    // TODO(burdon): Prevent multiple generations.
    // TODO(burdon): Update existing if meta changes?
    const generated = stack.sections.find((section) => section.type === 'generated');
    if (generated) {
      return;
    }

    const contact = space.db.getObjectById<Contact>(stack.subjectId)!;
    // TODO(burdon): Note: Just adding `contact` as the second arg returns an empty string.
    log.info('contact', { contact });
    if (!contact || !contact.employer) {
      return;
    }

    const name = contact.name;
    const organization = contact.employer!.name;

    const messages: ChatCompletionRequestMessage[] = [
      {
        role: 'user',
        content: `${organization} is a company`
      },
      {
        role: 'user',
        content: `${name} works for ${organization}`
      }
    ];

    // TODO(burdon): Factor out method.
    const addSection = async (prompt: string, title: string) => {
      messages.push({
        role: 'user',
        content: prompt
      });

      log.info('request', { messages });
      const message = await chatModel?.request(messages);
      if (!message) {
        return;
      }

      const { content } = message;
      log.info('response', { content });
      // TODO(burdon): Update @dxos/kai-types/testing functions to use this.
      // TODO(burdon): Add formatting?
      const text = new Text([title, '', content].join('\n'));
      const document = await space.db.add(new Document({ title, content: text }));
      // TODO(burdon): Add metadata.
      const section = new DocumentStack.Section({ type: 'generated', object: document });
      stack.sections.push(section);

      // Add response.
      messages.push(message);
    };

    await addSection(`write a short bio about ${name}`, 'Biography');
    await addSection(`write a short summary about ${organization}`, `About ${startCase(organization)}`);
  }
}
