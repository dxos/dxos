//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import {
  MockTreeItemOpenTrigger,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeItemOpenTrigger,
  TreeRoot,
} from './Tree';

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
    <>
      {keys.map((key) => {
        const value = data[key as keyof typeof data];
        const id = createKey(String(key), prefix);
        const valueIsScalar = isScalar(value);

        return (
          <TreeItem key={id} id={id} collapsible={!valueIsScalar} defaultOpen>
            <div role='none' className='grow flex'>
              {valueIsScalar ? <MockTreeItemOpenTrigger /> : <TreeItemOpenTrigger />}
              <TreeItemHeading classNames='grow pbs-1'>{valueIsScalar ? String(value) : key}</TreeItemHeading>
            </div>
            {!valueIsScalar && (
              <TreeItemBody className='pis-2'>
                <TreeBranch>
                  <StorybookTreeItem data={value} prefix={id} />
                </TreeBranch>
              </TreeItemBody>
            )}
          </TreeItem>
        );
      })}
    </>
  );
};

const StorybookTree = ({ data }: StorybookTreeProps) => {
  return (
    <TreeRoot density='fine'>
      <StorybookTreeItem data={data} />
    </TreeRoot>
  );
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
