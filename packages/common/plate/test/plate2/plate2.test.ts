//
// Copyright 2023 DXOS.org
//
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import extended from './extend/template.t';
import simpleFileGroup from './file-templates/group.t';
import simpleFile from './file-templates/simple.md.t';
import simpleDir from './simple/template.t';

chai.use(chaiAsPromised);

describe('plate 2 templates', () => {
  it('exists', () => {
    expect(simpleDir).to.exist;
    expect(extended).to.exist;
  });

  it('file templates', async () => {
    expect(simpleFile).to.be.a('function');
    expect(simpleFileGroup).to.be.a('function');

    const result = await simpleFile({ input: { name: 'zanzibar' } });
    expect(result).to.exist;
    expect(result.files).to.be.an('array');
    expect(result.files.length).to.eq(1);
    const [file] = result.files;
    expect(file).to.exist;
    expect(file.path).to.eq('simple.md');
    expect(file.content).to.eq('the name was zanzibar');
  });

  it('simple template', async () => {
    const name = 'alice';
    const result = await simpleDir.execute({
      input: {
        name
      }
    });

    expect(result).to.exist;
    const { files } = result;

    expect(files).to.exist;
    expect(files).to.be.an('array').of.length(3, 'has three result files');

    const [first, second, third] = files;
    expect(first.path).to.exist.and.match(/atextfile\.md$/);
    expect(first.content).to.eq('hello world\n');

    expect(second.path).to.exist.and.match(/one\.md$/);
    expect(second.content).to.eq(`name: ${name}`);

    expect(third.path).to.exist.and.match(/two\.md$/);
    expect(third.content).to.eq(`name: ${name}, slots.prop = default prop`);
  });

  it('inherited template', async () => {
    const name = 'bob';
    const result = await extended.execute({
      input: {
        name
      }
    });

    expect(result).to.exist;
    const { files } = result;

    expect(files).to.exist;
    expect(files).to.be.an('array').of.length(3, 'has three result files');

    const [first, second, third] = files;
    expect(first.path).to.exist.and.match(/atextfile\.md$/);
    expect(first.content).to.eq('hello world\n');

    expect(second.path).to.exist.and.match(/one\.md$/);
    expect(second.content).to.eq(`name: ${name}`);

    expect(third.path).to.exist.and.match(/two\.md$/);
    expect(third.content).to.eq(`salutations, ${name}`);
  });
});
