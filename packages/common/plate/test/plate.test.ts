//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'node:path';

import extended from './extend/template.t';
import simpleFileGroup from './file-templates/group.t';
import simpleFile from './file-templates/simple.md.t';
import simpleDir from './simple/template.t';
import { plate } from '../src';

chai.use(chaiAsPromised);

describe('plate 2 templates', () => {
  it('exists', () => {
    expect(simpleDir).to.exist;
    expect(extended).to.exist;
  });

  it('templating helpers', () => {
    const test = plate`hello`;
    expect(test).to.exist.and.equal('hello');
    const test2 = plate`
    spurious tabs
    `;
    expect(test2).to.equal('spurious tabs\n');
    expect(plate`
    something
    something else
    ${() => 'function'}
    `).to.equal('something\nsomething else\nfunction\n');
    expect(plate`
    something
    something else
    ${() => plate`function`}
    `).to.equal('something\nsomething else\nfunction\n');
  });

  it('file template', async () => {
    expect(simpleFile).to.be.a('function');

    const result = await simpleFile({ input: { name: 'zanzibar' } });
    expect(result).to.exist;
    expect(result.files).to.be.an('array');
    expect(result.files.length).to.eq(1);
    const [file] = result.files;
    expect(file).to.exist;
    expect(file.path).to.contain('simple.md');
    expect(file.content).to.eq('the name was zanzibar\n');
  });

  it('file group template', async () => {
    expect(simpleFileGroup).to.be.a('function');
    const result = await simpleFileGroup({});
    expect(result).to.exist;
    expect(result.files).to.be.an('array');
    expect(result.files.length).to.eq(2);
    const [file1, file2] = result.files;
    expect(file1).to.exist;
    expect(file1.content).to.eq('some content');
    expect(file1.path).to.eq(path.resolve(process.cwd(), 'content-1.md'));
    expect(file2).to.exist;
    expect(file2.content).to.eq('content was slots foo');
    expect(file2.path).to.eq(path.resolve(process.cwd(), 'content-2.md'));
  });

  it('simple template', async () => {
    const name = 'alice';
    const result = await simpleDir.apply({
      input: {
        name,
      },
      parallel: false,
    });

    expect(result).to.exist;
    const { files } = result;

    expect(files).to.exist;
    expect(files).to.be.an('array').of.length(3, 'has three result files');

    const first = files.find(({ path }) => path.match(/atextfile\.md$/));
    expect(first).to.exist;
    expect(first!.content).to.eq('');
    expect(first!.copyOf).to.match(/atextfile\.md$/);

    const second = files.find(({ path }) => path.match(/one\.md$/));
    expect(second).to.exist;
    expect(second!.path).to.exist.and.match(/one\.md$/);
    expect(second!.content).to.eq(`name: ${name}\n`);

    const third = files.find(({ path }) => path.match(/two\.js$/));
    expect(third).to.exist;
    expect(third!.path).to.exist.and.match(/two\.js$/);
    expect(third!.content).to.eq(plate`
    import { foo } from ".";
    const bar = foo;
    const name = "${name}";
    const slot = "simple";
    `);
  });

  it('inherited template', async () => {
    const name = 'bob';
    const result = await extended.apply({
      input: {
        name,
      },
      parallel: false,
    });

    expect(result).to.exist;
    const { files } = result;

    expect(files).to.exist;
    expect(files).to.be.an('array').of.length(3, 'has three result files');

    const [atextfile, one, two] = files;

    expect(atextfile.path).to.exist.and.match(/atextfile\.md$/);
    expect(atextfile.content).to.eq('');
    expect(atextfile.copyOf).to.match(/atextfile\.md$/);

    expect(one.path).to.exist.and.match(/one\.md$/);
    expect(one.content).to.eq(`name: prefixed ${name}\n`);

    expect(two.path).to.exist.and.match(/two\.js$/);
    expect(two.content).to.eq(plate`
    import { prefixed, foo } from ".";
    const bar = foo;
    const name = "prefixed ${name}";
    const slot = "prefixed simple";
    `);
  });
});
