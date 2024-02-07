//
// Copyright 2024 DXOS.org
//

import OpenAI from 'openai';

import { type Document as DocumentType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { getTextContent } from '@dxos/react-client/echo';

export type GptAnalyzerOptions = {
  apiKey: string;
};

export class GptAnalyzer {
  private readonly _api: OpenAI;

  constructor(private readonly _options: GptAnalyzerOptions) {
    invariant(this._options.apiKey);
    this._api = new OpenAI({
      apiKey: this._options.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async exec(space: Space, document: DocumentType) {
    console.info('analyzing...');
    const text = getTextContent(document.content);
    console.log({ text });

    // TODO(burdon): Send to GPT with JSON prompt.
    // TODO(burdon): Specify schema and function callback.
    // TODO(burdon): Parse response and add objects to tables.
  }
}
