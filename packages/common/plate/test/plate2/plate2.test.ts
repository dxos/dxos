//
// Copyright 2023 DXOS.org
//
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import extended from './extend/template.t';
import simple from './simple/template.t';

chai.use(chaiAsPromised);

describe('plate templates exist', () => {
  it('exists', () => {
    expect(simple).to.exist;
    expect(extended).to.exist;
  });

  it('simple template', async () => {
    const result = await simple.execute({
      input: {
        name: 'johndoe'
      }
    });
    expect(result).to.exist;
    const { results } = result;
    expect(results).to.exist;
    expect(results).to.be('array').of.length(3);
  });
});
