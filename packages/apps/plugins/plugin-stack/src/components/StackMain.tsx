//
// Copyright 2023 DXOS.org
//

import React, { Fragment, useState } from 'react';

import { Stack as StackProto, Document } from '@braneframe/types';
import { Button, useTranslation } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

export type StackMainProps = {
  role?: string;
  data?: StackProto;
};

export const StackMain = observer(({ data: stack }: StackMainProps) => {
  const { t } = useTranslation('plugin-stack');
  // todo(thure): Why isn’t this updating when stack.sections is set? This should be unnecessary.
  const [iter, setIter] = useState(0);
  return (
    <article>
      <span className='hidden'>{iter}</span>
      {stack?.sections.map(({ object }) => (
        <Fragment key={object.id}>
          <p className='mlb-2'>{object.id}</p>
          <Surface role='section' data={object} />
        </Fragment>
      ))}
      <Button
        onClick={() => {
          if (stack) {
            const document = new Document();
            const section = new StackProto.Section({ object: document });
            stack.sections = [...stack.sections, section];
            setIter(iter + 1);
          }
        }}
      >
        {t('add section label')}
      </Button>
    </article>
  );
});
