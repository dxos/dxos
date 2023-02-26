//
// Copyright 2023 DXOS.org
//

import { Configuration, OpenAIApi } from 'openai';

import { Subscription } from '@dxos/echo-schema';

import { Organization } from '../../proto';
import { Bot } from '../bot';

const config = {
  organization: process.env.OPENAI_ORG_ID,
  // TODO(burdon): Get API key from runtime config.
  // https://beta.openai.com/account/api-keys
  apiKey: process.env.OPENAI_API_KEY
};

/**
 * Adds info to records.
 */
export class ResearchBot extends Bot {
  private readonly _cache = new Map<string, string>();
  private _subscription?: Subscription;
  private _api?: OpenAIApi;

  override async onStart() {
    // TODO(burdon): Hack to workaround error:
    //  - Refused to set unsafe header "User-Agent".
    const configuration = new Configuration(config);
    delete configuration.baseOptions.headers['User-Agent'];

    this._api = new OpenAIApi(configuration);

    // TODO(burdon): Update when object mutated.
    const query = this.db.query(Organization.filter());
    this._subscription = query.subscribe(async (query) => {
      await Promise.all(
        query.objects.map(async (object) => {
          await this.onUpdate(object);
        })
      );
    });
  }

  override async onStop() {}

  async onUpdate(object: Organization) {
    if (!object.description && !this._cache.has(object.name)) {
      object.description = '...';

      const completion = await this._api!.createCompletion({
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
