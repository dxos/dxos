//
// Copyright 2024 DXOS.org
//

import {
  MemoryVectorIndex,
  ollama,
  retrieve,
  Tool,
  upsertIntoVectorIndex,
  VectorIndexRetriever,
  zodSchema,
} from 'modelfusion';

import { log } from '@dxos/log';
import { z } from '@dxos/plate';

// TODO(burdon): Convert to effect schema.
export type Contact = { name: string; role?: string };

export class Directory {
  contacts = new Map<string, Contact>();
  vectorIndex = new MemoryVectorIndex<string>();
  embeddingModel = ollama.TextEmbedder({ model: 'nomic-embed-text' });
  retriever = new VectorIndexRetriever({
    vectorIndex: this.vectorIndex,
    embeddingModel: this.embeddingModel,
    maxResults: 1,
    similarityThreshold: 0.5,
  });

  async upsert(contacts: Contact[]) {
    contacts.forEach((contact) => this.contacts.set(contact.name, contact));
    await upsertIntoVectorIndex({
      vectorIndex: this.vectorIndex,
      embeddingModel: this.embeddingModel,
      objects: contacts.map((contact) => contact.role),
      getValueToEmbed: (text) => text,
    });
  }

  async getByRole(role: string) {
    const roles = await retrieve(this.retriever, role);
    if (!roles.length) {
      return [];
    }

    return Array.from(this.contacts.values()).filter((contact) => contact.role === roles[0]);
  }
}

export const directory = (directory: Directory) =>
  new Tool({
    name: 'directory',
    description: 'Find people.',
    parameters: zodSchema(
      z.object({
        name: z.string().optional().nullable().describe('Name of person.'),
        role: z.string().optional().nullable().describe('Role of person.'),
      }),
    ),
    returnType: zodSchema(
      z.object({
        people: z.array(z.string()).describe('List of usernames.'),
      }),
    ),
    execute: async ({ name, role, ...rest }) => {
      log.info('directory', { name, role, rest });
      let contacts: Contact[] = [];
      if (role) {
        contacts = await directory.getByRole(role);
      }

      return {
        people: contacts.map((contact) => contact.name),
      };
    },
  });
