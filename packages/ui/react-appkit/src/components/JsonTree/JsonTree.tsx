//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { TreeItem, Tree, type TreeRootProps } from '@dxos/aurora';

const isScalar = (data: any) => !(typeof data === 'object' || Array.isArray(data));
const createKey = (key: string, prefix?: string) => (prefix === undefined ? key : `${prefix}.${key}`);

type JsonTreeNodeProps = { data: Record<string, any> | any[]; prefix?: string };

const JsonTreeBranch = ({ data, prefix }: JsonTreeNodeProps) => {
  const keys = Array.isArray(data) ? Array.from(data.keys()) : Object.keys(data);
  return (
    <>
      {keys.map((key) => {
        const value = data[key as keyof typeof data];
        const id = createKey(String(key), prefix);
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
                  <JsonTreeBranch data={value} prefix={id} />
                </Tree.Branch>
              </TreeItem.Body>
            )}
          </TreeItem.Root>
        );
      })}
    </>
  );
};

type JsonTreeProps = { data: Record<string, any> } & TreeRootProps;

const JsonTree = ({ data, ...props }: JsonTreeProps) => {
  return (
    <Tree.Root density='fine' {...props}>
      <JsonTreeBranch data={data} />
    </Tree.Root>
  );
};

export { JsonTree };

export type { JsonTreeProps };
