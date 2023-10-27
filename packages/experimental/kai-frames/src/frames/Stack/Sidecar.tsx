//
// Copyright 2022 DXOS.org
//

import { CaretDoubleLeft, X } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { DocumentStack } from '@dxos/kai-types';
import { ScrollContainer } from '@dxos/mosaic';

import { useFrameContext } from '../../hooks';

// TODO(burdon): Type?
export type Section = {
  text: string;
  actions?: string[];
};

export type SidecarStackProps = {
  sections?: Section[];
};

export const SidecarStack: FC<SidecarStackProps> = ({ sections = [] }) => {
  return (
    <ScrollContainer vertical>
      {sections.map((section, i) => (
        <div key={i} className='flex w-full py-2 border-b'>
          <div className='flex flex-col shrink-0 w-10 items-center'>
            <Button variant='ghost' density='fine'>
              <CaretDoubleLeft className={getSize(4)} />
            </Button>
          </div>
          <div className='flex flex-col w-full grow px-2 py-1 text-sm'>
            <div>{section.text}</div>
            {(section.actions?.length ?? 0) > 0 && (
              <div className='pt-6 space-x-2 text-xs'>
                {section.actions?.map((action, i) => (
                  <span key={i} className='px-2 py-1 bg-blue-100 rounded cursor-pointer select-none'>
                    {action}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className='flex flex-col shrink-0 w-10 items-center'>
            <Button variant='ghost' density='fine'>
              <X className={getSize(4)} />
            </Button>
          </div>
        </div>
      ))}
    </ScrollContainer>
  );
};

export const Sidecar = () => {
  const { space, objectId } = useFrameContext();
  const stack = objectId ? space!.db.getObjectById<DocumentStack>(objectId) : undefined;
  if (!space || !stack) {
    return null;
  }

  return (
    <div className='flex shrink-0 md:w-[400px] overflow-y-auto'>
      <div className='flex flex-col flex-1 bg-zinc-100'>
        <SidecarStack />
      </div>
    </div>
  );
};

export default Sidecar;
