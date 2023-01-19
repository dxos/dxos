//
// Copyright 2023 DXOS.org
//

import base from 'base-x';
import { Configuration, OpenAIApi } from 'openai';

import { EchoDatabase } from '@dxos/echo-schema';

import { Organization } from '../proto';
import { Bot } from './bot';

const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

const config = {
  organization: 'org-mZTRiNMMnvZWUqWxPlirjw5l',
  // Dangerously unsafe obfuscation of API KEY.
  // https://beta.openai.com/account/api-keys
  apiKey: base62.decode('3U7sbXYdzwNsY8TGXWVeTPoxBcONui3sclUrrTnAZ5F23YpoM0nSFrYxaHDZqTdI84f5M').toString()
};

/**
 * Adds info to records.
 */
export class ResearchBot extends Bot<Organization> {
  private readonly _api: OpenAIApi;
  private readonly _cache = new Map<string, string>();

  constructor(db: EchoDatabase) {
    super(db, Organization.filter());

    // TODO(burdon): Hack to workaround error:
    //  - Refused to set unsafe header "User-Agent".
    const configuration = new Configuration(config);
    delete configuration.baseOptions.headers['User-Agent'];

    this._api = new OpenAIApi(configuration);
  }

  override async onUpdate(object: Organization) {
    if (!object.description && !this._cache.has(object.name)) {
      object.description = '...';

      const completion = await this._api.createCompletion({
        model: 'text-davinci-003',
        prompt: `describe ${object.name}`,
        max_tokens: 128
      });

      const { text } = completion.data.choices[0];
      if (text) {
        // Remove last sentence since likely incomplete.
        const sentences = text.trim().split('.');
        if (sentences.length > 1) {
          sentences.splice(sentences.length - 2, 1);
        }

        object.description = sentences.join('. ');
        this._cache.set(object.name, object.description);
        console.log('Updated:', object.name);
      }
    }
  }
}
