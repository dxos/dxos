//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import {
  AirplaneTakeoff,
  ArrowLeft,
  ArrowRight,
  Bank,
  Buildings,
  HouseSimple,
  Notepad,
  Plus,
  User,
  Users
} from 'phosphor-react';
import React, { FC, useEffect, useMemo, useState } from 'react';
import hash from 'string-hash';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { convertTreeToGraph, createTree, TestNode, TestGraphModel, Markers, GraphLayoutNode } from '@dxos/gem-spore';
import { getSize, mx } from '@dxos/react-components';

import '@dxosTheme';

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

const Panel: FC<{ node: TestNode; className?: string }> = ({ node, className }) => {
  const Icon = icons[hash(node.label ?? '') % icons.length];

  return (
    <div className='absolute invisible md:visible right-[16px] flex flex-col h-full justify-center overflow-hidden'>
      <div className={mx('flex overflow-hidden w-[300px] h-[370px] p-2 px-3 rounded-lg border-2', className)}>
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
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  // TODO(burdon): Pass down state to context (set nav, etc.)
  const [spinning, setSpinning] = useState(true);

  const model = useMemo(() => {
    const root = createTree({ depth: 5, children: 3 });
    const model = new TestGraphModel(convertTreeToGraph(root));
    model.setSelected(root.id);
    setHistory([model.selected!]);
    return model;
  }, []);

  // Create initial associations.
  useEffect(() => {
    const nodes = Array.from({ length: 32 }).map(() => model.getRandomNode());
    nodes.forEach((node) => {
      model.createNodes(node);
    });
  }, []);

  // Do transition on history change.
  useEffect(() => {
    model.setSelected(history[index]);
  }, [index]);

  const handleGenerate = () => {
    model.createNodes(model.getNode(model.selected!));
  };

  const handleSelect = (node: TestNode) => {
    setHistory((history) => [...history, node.id]);
    setIndex((idx) => idx + 1);
  };

  const handleHome = () => {
    setIndex(0);
  };

  const handleBack = () => {
    setIndex((idx) => (idx > 0 ? idx - 1 : idx));
  };

  const handleForward = () => {
    setIndex((idx) => (idx < history.length - 1 ? idx + 1 : idx));
  };

  const node = history.length ? model.getNode(history[index]) : undefined;

  const slots = {
    grid: {
      className: '[&>*]:stroke-slate-700 [&>*]:stroke-[1px] [&>*]:opacity-40'
    },
    plexus: {
      thorax: {
        className: '[&>*]:stroke-2 [&>*]:stroke-slate-500'
      },
      renderer: {
        labels: {
          text: (node: GraphLayoutNode<TestNode>) => node.data!.label
        }
      },
      projector: {
        radius: 192,
        nodeRadius: 16,
        classes: {
          guide: {
            circle: 'fill-transparent stroke-[1px] stroke-slate-700'
          },
          node: {
            circle: 'fill-slate-800 stroke-[1px] stroke-slate-500',
            // TODO(burdon): Restructure slots to support other props (e.g., font-size).
            text: 'fill-slate-400'
          },
          link: {
            path: 'stroke-[2px] stroke-slate-700'
          }
        }
      }
    }
  };

  return (
    <div className='flex flex-col absolute left-0 right-0 top-0 bottom-0'>
      <div className='flex flex-1 relative'>
        <SVGContextProvider>
          <SVG className={mx('bg-slate-800')}>
            <Markers arrowSize={6} />
            <Grid className={slots?.grid?.className} />
            <Zoom extent={[1, 4]}>
              <g className={mx('visible', spinning && 'invisible')}>
                <line className='stroke-slate-700 stroke-[3px]' x1={0} y1={0} x2={600} y2={0} />
              </g>
              <Plexus model={model} slots={slots?.plexus} onSelect={handleSelect} onTransition={setSpinning} />
            </Zoom>
          </SVG>
        </SVGContextProvider>

        {node && <Panel node={node} className='border-slate-500 bg-slate-800 text-slate-400' />}
      </div>

      <div className='flex p-1 items-center'>
        <button className='p-1' onClick={handleGenerate}>
          <Plus className={getSize(6)} />
        </button>
        <button className='p-1' onClick={handleHome}>
          <HouseSimple className={getSize(6)} />
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
