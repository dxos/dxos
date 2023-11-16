//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Schema } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import handler from './chess';
import { TestBuildler } from '../testing';

describe.skip('Prompts', () => {
  const builder = new TestBuildler().init();
  before(() => builder.init());

  test('json', async () => {
    const schema = new Schema({
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
        },
        {
          id: 'description',
          description: 'Short summary',
          type: Schema.PropType.STRING,
        },
        {
          id: 'website',
          description: 'Web site URL (not github)',
          type: Schema.PropType.STRING,
        },
        {
          id: 'repo',
          description: 'Github repo URL',
          type: Schema.PropType.STRING,
        },
      ],
    });

    const messages = handler({ message: 'List the 3 most popular open source projects that implement CRDTs.', schema });
    expect(messages).to.have.length.greaterThan(1);
    const result = await builder.model.predictMessages(messages!);
    console.log(JSON.stringify(JSON.parse(result.content), undefined, 2));
  });
});
