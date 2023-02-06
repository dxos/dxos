//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import {
  AirplaneTakeoff,
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Bank,
  Buildings,
  Notepad,
  User,
  Users
} from 'phosphor-react';
import React, { FC, useEffect, useMemo, useState } from 'react';
import hash from 'string-hash';

import { convertTreeToGraph, createTree, TestNode, TestGraphModel } from '@dxos/gem-spore';
import { getSize, mx } from '@dxos/react-components';

import '@dxosTheme';

import { PlexusStateContext } from '../hooks';
import { Plexus } from './Plexus';

faker.seed(1);

const icons = [AirplaneTakeoff, Bank, Buildings, Notepad, User, Users];

export default {
  component: Plexus,
  argTypes: {}
};

// TODO(burdon): Factor testing out of gem-spore/testing
// TODO(burdon): Generate typed tree data.
// TODO(burdon): Layout around focused element (up/down); hide distant items.
//  - large collections (scroll/zoom/lens?)
//  - square off leaf nodes (HTML list blocks) with radial lines into circles
//  - search

export const Panel: FC<{ node: TestNode; className?: string }> = ({ node, className }) => {
  const Icon = icons[hash(node.label ?? '') % icons.length];

  return (
    <div className='absolute invisible md:visible right-[16px] flex flex-col h-full justify-center overflow-hidden'>
      <div className={mx('flex overflow-hidden w-[300px] h-[360px] p-2 px-3 rounded-lg border-2', className)}>
        <div className='flex flex-1 flex-col w-full text-sm'>
          <div className='flex w-full justify-center text-lg'>{node.label}</div>
          <div className='flex justify-center py-1'>
            <Icon weight='duotone' className={getSize(40)} />
          </div>
          <div className='py-2'>{faker.lorem.sentences(3)}</div>
          <div className='flex-1' />
          <div className='text-xs pb-2'>{node.id}</div>
        </div>
      </div>
    </div>
  );
};

const Test = () => {
  const [transition, setTransition] = useState(0);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const model = useMemo(() => {
    const root = createTree({ depth: 5, children: 3 });
    const model = new TestGraphModel(convertTreeToGraph(root), root.id);
    setHistory([model.selected!]);
    return model;
  }, []);

  const node = history.length ? model.getNode(history[index]) : undefined;

  useEffect(() => {
    const nodes = Array.from({ length: 32 }).map(() => model.getRandomNode());
    nodes.forEach((node) => {
      model.createNodes(node);
    });
  }, []);

  useEffect(() => {
    model.setSelected(history[index]);
    setTransition(Date.now());
  }, [index]);

  const handleGenerate = () => {
    model.createNodes(model.getNode(model.selected!));
  };

  const handleSelect = (node: TestNode) => {
    setHistory((history) => [...history, node.id]);
    setIndex((idx) => idx + 1);
  };

  const handleBack = () => {
    setIndex((idx) => (idx > 0 ? idx - 1 : idx));
  };

  const handleForward = () => {
    setIndex((idx) => (idx < history.length - 1 ? idx + 1 : idx));
  };

  return (
    <div className='flex flex-col absolute left-0 right-0 top-0 bottom-0'>
      <div className='flex flex-1 relative'>
        <PlexusStateContext.Provider value={{ transition }}>
          <Plexus<TestNode> model={model} onSelect={handleSelect} />
        </PlexusStateContext.Provider>

        {node && <Panel node={node} className='border-slate-500 bg-slate-800 text-slate-400' />}
      </div>

      <div className='flex p-1 items-center'>
        <button className='p-1' onClick={handleGenerate}>
          <ArrowCounterClockwise className={getSize(6)} />
        </button>
        <button className='p-1' onClick={handleBack}>
          <ArrowLeft className={getSize(6)} />
        </button>
        <button className='p-1' onClick={handleForward}>
          <ArrowRight className={getSize(6)} />
        </button>
      </div>
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
