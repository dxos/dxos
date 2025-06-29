//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

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
  Users,
} from '@phosphor-icons/react';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import hash from 'string-hash';

import { faker } from '@dxos/random';
import { SVG, type GraphLayoutNode } from '@dxos/react-ui-graph';
import { convertTreeToGraph, createTree, type TestNode, TestGraphModel } from '@dxos/react-ui-graph/testing';
import { getSize, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Plexus } from './Plexus';

faker.seed(1);

const icons = [AirplaneTakeoff, Bank, Buildings, Notepad, User, Users];

export default {
  component: Plexus,
  title: 'experimental/plexus/Plexus',
  render: () => <Test />,
  decorators: [withTheme],
};

const Panel: FC<{ node: TestNode; className?: string }> = ({ node, className }) => {
  const Icon = icons[hash(node.label ?? '') % icons.length];

  return (
    <div className={mx('flex overflow-hidden w-[300px] h-[370px] p-2 px-3 rounded-md border-2', className)}>
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
  );
};

const Test = () => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const { ref: containerRef, width, height } = useResizeDetector();
  const [lineLength, setLineLength] = useState(0);

  // TODO(burdon): Pass down state to context (set nav, etc.)
  const [spinning, setSpinning] = useState(true);

  // const selection = useMemo(() => new SelectionModel(), []);
  const model = useMemo(() => {
    const root = createTree({ depth: 5, children: 3 });
    const model = new TestGraphModel(convertTreeToGraph(root));
    // selection.setSelected(root.id);
    setHistory([root.id]);
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
    // selection.setSelected(history[index]);
  }, [index]);

  const handleGenerate = () => {
    // model.createNodes(model.getNode(selection.selected!));
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

  const dark = true;
  const slots = dark
    ? {
        grid: {
          className: '*:stroke-slate-700 *:stroke-[1px] *:opacity-40',
        },
        plexus: {
          thorax: {
            // TODO(burdon): Reconcile classes vs. slots/className.
            className: '*:stroke-slate-500',
          },
          renderer: {
            labels: {
              text: (node: GraphLayoutNode<TestNode>) => node.data!.label,
            },
          },
          projector: {
            radius: 192,
            nodeRadius: 16,
            classes: {
              guide: {
                circle: 'fill-transparent stroke-[1px] stroke-slate-700',
              },
              node: {
                circle: 'fill-slate-800 stroke-[1px] stroke-slate-500',
                // TODO(burdon): Restructure slots to support other props (e.g., font-size).
                text: 'fill-slate-400',
              },
              link: {
                path: 'stroke-[2px] stroke-slate-700',
              },
            },
          },
        },
        panel: 'border-slate-500 bg-slate-800 text-slate-400',
        root: 'bg-slate-800',
      }
    : {};

  // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
  useEffect(() => {
    if (width) {
      const { left } = panelRef.current!.getBoundingClientRect();
      setLineLength(left - width / 2);
    }
  }, [panelRef, width, height]);

  return (
    <div ref={containerRef} className='flex flex-col absolute left-0 right-0 top-0 bottom-0'>
      <div className='flex flex-1 relative'>
        <SVG.Root>
          {/* <SVG classNames={slots?.root}> */}
          <SVG.Markers arrowSize={6} />
          <SVG.Grid /* className={slots?.grid?.className} */ />
          <SVG.Zoom extent={[1, 4]}>
            <g className={mx('visible', spinning && 'invisible')}>
              <line className='stroke-slate-700 stroke-[3px]' x1={0} y1={0} x2={lineLength} y2={0} />
            </g>
            <Plexus model={model} slots={slots?.plexus} onSelect={handleSelect} onTransition={setSpinning} />
          </SVG.Zoom>
          {/* </SVG> */}
        </SVG.Root>

        {node && (
          <div
            ref={panelRef}
            className='absolute invisible md:visible right-[16px] flex flex-col h-full justify-center overflow-hidden'
          >
            <Panel node={node} className={mx('bg-white', slots?.panel)} />
          </div>
        )}
      </div>

      <div className='flex p-1 items-center bg-slate-700'>
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

export const Default = {};
