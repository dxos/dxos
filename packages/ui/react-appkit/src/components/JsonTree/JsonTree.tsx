//
// Copyright 2023 DXOS.org
//
import React from 'react';

import {
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeRoot,
  TreeRootProps,
  TreeBranch,
  MockTreeItemOpenTrigger,
  TreeItemOpenTrigger,
} from '@dxos/aurora';

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
          <TreeItem key={id} id={id} collapsible={!valueIsScalar} defaultOpen>
            <div role='none' className='grow flex'>
              {valueIsScalar ? <MockTreeItemOpenTrigger /> : <TreeItemOpenTrigger />}
              <TreeItemHeading classNames='grow pbs-1'>{valueIsScalar ? String(value) : key}</TreeItemHeading>
            </div>
            {!valueIsScalar && (
              <TreeItemBody className='pis-2'>
                <TreeBranch>
                  <JsonTreeBranch data={value} prefix={id} />
                </TreeBranch>
              </TreeItemBody>
            )}
          </TreeItem>
        );
      })}
    </>
  );
};

type JsonTreeProps = { data: Record<string, any> } & TreeRootProps;

const JsonTree = ({ data, ...props }: JsonTreeProps) => {
  return (
    <TreeRoot density='fine' {...props}>
      <JsonTreeBranch data={data} />
    </TreeRoot>
  );
};

export { JsonTree };

export type { JsonTreeProps };
