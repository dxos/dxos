//
// Copyright 2023 DXOS.org
//
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'node:path';

import { executeDirectoryTemplate } from '../src';

chai.use(chaiAsPromised);

describe('executeDirectoryTemplate', () => {
  it('exists', () => {
    expect(executeDirectoryTemplate).to.exist;
  });

  it('execute a basic template', async () => {
    const results = await executeDirectoryTemplate({
      templateDirectory: path.resolve(__dirname, 'template'),
      input: {
        name: 'foo',
      },
      interactive: false,
    });
    expect(results).to.exist;
    expect(results.files.length).to.eq(2);
  });

  it('execute inherited template', async () => {
    const results = await executeDirectoryTemplate({
      templateDirectory: path.resolve(__dirname, 'inherited'),
      input: {
        name: 'foo',
        bar: true,
      },
      interactive: false,
    });
    expect(results).to.exist;
    expect(results.files.length).to.eq(3);
    const [file, ...rest] = results.files.filter((f) => f.path.endsWith('README.md'));
    expect(file).to.exist;
    expect(rest?.length).to.eq(0);
    expect(file?.content).to.exist.and.be.a.string;
    expect(file?.content.length).to.be.greaterThan(0);
    expect(/content-to-be-replaced/.test(file?.content)).to.be.false;
    expect(/replaced-content-here/.test(file?.content)).to.be.true;
  });
});
