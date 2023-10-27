//
// Copyright 2023 DXOS.org
//

import startCase from 'lodash.startcase';
import { type ChatCompletionRequestMessage } from 'openai';

import { Document } from '@braneframe/types';
import { type Space, Text, TextKind } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { type Contact, DocumentStack } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { type Resolver } from '../../resolver';
import { type ChatModel } from '../chat-model';

// eslint-disable-next-line unused-imports/no-unused-vars
const parseJson = (content: string) => {
  const clean = content.replace(/\n/g, '');
  const [, json] = clean.match(/```(.+)```/) ?? [];
  if (json) {
    return JSON.parse(json);
  }
};

export class ContactStackResolver implements Resolver<DocumentStack> {
  // prettier-ignore
  constructor(
    private readonly _id: string,
    private readonly _chatModel: ChatModel,
  ) {
    invariant(this._id);
    invariant(this._chatModel);
  }

  async update(space: Space, stack: DocumentStack) {
    // TODO(burdon): Update existing if meta changes?
    if (stack.sections.find((section) => section.source?.resolver === this._id)) {
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
        content: `${organization} is a company`,
      },
      {
        role: 'user',
        content: `${name} works for ${organization}`,
      },
    ];

    // TODO(burdon): Factor out method.
    const addTextSection = async (prompt: string, title: string) => {
      messages.push({
        role: 'user',
        content: prompt,
      });

      log('request', { messages });
      const message = await this._chatModel?.request(messages);
      if (!message) {
        return;
      }

      const { content } = message;
      log.info('response', { content });

      // TODO(burdon): Add structured document section.
      // const data = parseJson(content);

      // TODO(burdon): Add formatting?
      const text = new Text([title, '', content].join('\n'), TextKind.RICH);
      const document = await space.db.add(new Document({ title, content: text }));

      // TODO(burdon): Add metadata.
      const section = new DocumentStack.Section({ source: { resolver: this._id }, object: document });
      stack.sections.push(section);

      // Add response.
      messages.push(message);
    };

    // TODO(burdon): Check if already added.
    await addTextSection(`write a short bio about ${name}`, 'Biography');
    await addTextSection(`write a short summary about ${organization}`, `About ${startCase(organization)}`);
    // await addTextSection(
    //   `output a list of ${organization} executives' name and title in json format`,
    //   `${startCase(organization)} Team`
    // );
  }
}
