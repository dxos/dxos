//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import { ArrowCounterClockwise } from 'phosphor-react';
import React, { useMemo } from 'react';

import { TestGraphModel, convertTreeToGraph, createTree, TestNode } from '@dxos/gem-spore';
import { getSize } from '@dxos/react-components';

import '@dxosTheme';

import { Plexus } from './Plexus';

faker.seed(1);

export default {
  component: Plexus,
  argTypes: {}
};

// TODO(burdon): Factor testing out of gem-spore/testing

const Test = () => {
  const model = useMemo(() => {
    const root = createTree({ depth: 4, children: 6 });
    console.log(root);
    // console.log(JSON.stringify(root, undefined, 1));
    return new TestGraphModel(convertTreeToGraph(root), root.id);
  }, []);

  const handleGenerate = () => {
    // TODO(burdon): Randomize model.
    model.createNodes();
  };

  return (
    <div className='flex flex-col absolute left-0 right-0 top-0 bottom-0'>
      <Plexus<TestNode> model={model} />

      <div className='flex p-1 items-center'>
        <button className='p-1' onClick={handleGenerate}>
          <ArrowCounterClockwise className={getSize(6)} />
        </button>
      </div>
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
