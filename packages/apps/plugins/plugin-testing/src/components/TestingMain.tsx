//
// Copyright 2023 DXOS.org
//

import type { Faker } from '@faker-js/faker';
import { Play, Stop } from '@phosphor-icons/react';
import React, { FC, useEffect, useRef, useState } from 'react';

import { Document, Testing as TestingType } from '@braneframe/types';
import { Button, DensityProvider, Main } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { SpaceProxy, Text } from '@dxos/client';
import { range } from '@dxos/util';

export type TestingMainOptions = {
  readonly: boolean;
};

export const TestingMain: FC<{ data: [SpaceProxy, TestingType] }> = ({ data: [space, object] }) => {
  const fakerRef = useRef<Faker>();
  const objects = space.db?.query().objects;
  const data = {
    objects: objects?.length,
  };

  const [running, setRunning] = useState(false);
  const handleToggleRunning = () => {
    setRunning((running) => !running);
  };

  useEffect(() => {
    setTimeout(async () => {
      const { faker } = await import('@faker-js/faker');
      fakerRef.current = faker;
    });
  });

  const handleGenerate = () => {
    // TODO(burdon): Create or update.
    const type = Document.type.name;
    switch (type) {
      case Document.type.name: {
        // TODO(burdon): Factor out generators.
        const title = fakerRef.current!.lorem.sentence();
        const content = range(fakerRef.current!.datatype.number({ min: 3, max: 8 }))
          .map(() => fakerRef.current!.lorem.sentences(fakerRef.current!.datatype.number({ min: 2, max: 16 })))
          .join('\n\n');

        space.db.add(new Document({ title, content: new Text(content) }));
        break;
      }
    }
  };

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='flex p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={handleToggleRunning}>
            {running ? <Stop className={getSize(5)} /> : <Play className={getSize(5)} />}
          </Button>
          <Button onClick={handleGenerate}>Create object</Button>
        </DensityProvider>
      </div>
      <div className='p-2'>
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    </Main.Content>
  );
};
