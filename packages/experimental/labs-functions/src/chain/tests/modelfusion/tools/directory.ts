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
export type Contact = { name: string; team?: string };

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
    const values = Array.from(
      contacts
        .reduce((acc, contact) => {
          if (contact.team) {
            acc.add(contact.team);
          }
          return acc;
        }, new Set<string>())
        .values(),
    );

    await upsertIntoVectorIndex({
      vectorIndex: this.vectorIndex,
      embeddingModel: this.embeddingModel,
      objects: values,
      getValueToEmbed: (text) => text,
    });
  }

  async getByTeam(team: string) {
    const teams = await retrieve(this.retriever, team);
    if (!teams.length) {
      return [];
    }

    return Array.from(this.contacts.values()).filter((contact) => contact.team === teams[0]);
  }
}

export const directory = (directory: Directory) =>
  new Tool({
    name: 'directory',
    description: 'Find people.',
    // TODO(burdon): Schema for query (e.g., role A or B).
    parameters: zodSchema(
      z
        .object({
          name: z.string().optional().nullable().describe('Name of person.'),
          team: z.string().optional().nullable().describe('Team name.'),
        })
        .describe('Values to filter list of people.'),
    ),
    returnType: zodSchema(
      z.object({
        people: z.array(z.string()).describe('List of usernames.'),
      }),
    ),
    execute: async ({ name, team }) => {
      log.info('directory', { name, team });
      let contacts: Contact[] = [];
      if (team) {
        contacts = await directory.getByTeam(team);
      }

      return {
        people: contacts.map((contact) => contact.name),
      };
    },
  });
