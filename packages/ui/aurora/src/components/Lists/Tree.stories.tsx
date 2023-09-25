//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Tree, TreeItem } from './Tree';

type StorybookTreeProps = {
  data: any;
};

type StorybookTreeItemProps = {
  data: any;
  prefix?: string;
};

const isScalar = (data: any) => !(typeof data === 'object' || Array.isArray(data));

const createKey = (key: string, prefix?: string) => (prefix === undefined ? key : `${prefix}.${key}`);

const StorybookTreeItem = ({ data, prefix }: StorybookTreeItemProps) => {
  const keys = Array.isArray(data) ? Array.from(data.keys()) : Object.keys(data);
  return (
    <Tree.Root density='fine'>
      {keys.map((key) => {
        const id = createKey(String(key), prefix);
        const value = data[key as keyof typeof data];
        const valueIsScalar = isScalar(value);

        return (
          <TreeItem.Root key={id} id={id} collapsible={!valueIsScalar} defaultOpen>
            <div role='none' className='grow flex'>
              {valueIsScalar ? <TreeItem.MockOpenTrigger /> : <TreeItem.OpenTrigger />}
              <TreeItem.Heading classNames='grow pbs-1'>{valueIsScalar ? String(value) : key}</TreeItem.Heading>
            </div>
            {!valueIsScalar && (
              <TreeItem.Body className='pis-2'>
                <Tree.Branch>
                  <StorybookTreeItem data={value} prefix={id} />
                </Tree.Branch>
              </TreeItem.Body>
            )}
          </TreeItem.Root>
        );
      })}
    </Tree.Root>
  );
};

const StorybookTree = ({ data }: StorybookTreeProps) => {
  return <StorybookTreeItem data={data} />;
};

export default {
  component: StorybookTree,
};

export const Default = {
  args: {
    data: {
      foo: 100,
      bar: {
        zoo: 200,
      },
      tags: ['a', 'b', 'c'],
      items: [
        {
          a: true,
          b: 100,
        },
        {
          c: 200,
        },
      ],
    },
  },
};
