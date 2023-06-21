//
// Copyright 2023 DXOS.org
//

import React, { Fragment, useEffect, useState } from 'react';

import { Main, Input, List, Button, useTranslation, randomString } from '@dxos/aurora';
import { subscribe } from '@dxos/observable-object';
import { Surface } from '@dxos/react-surface';

import { StackModel, StackProperties, StackSectionModel, StackSections } from '../props';

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({ sections }: { sections: StackSections }) => {
  const { t } = useTranslation('dxos:stack');
  const [_, setIter] = useState([]);
  useEffect(() => {
    // todo(thure): TypeScript seems to get the wrong return value from `ObservableArray.subscribe`
    return sections[subscribe](() => setIter([])) as () => void;
  }, []);
  return (
    <article>
      {sections
        // todo(thure): This filter should be unnecessary; why is the first value sometimes some sort of array-like object?
        .filter((section) => 'object' in section)
        .map(({ object }, o) => {
          return (
            <Fragment key={o}>
              <p className='mlb-2'>{o}</p>
              <Surface role='section' data={[object, object]} />
            </Fragment>
          );
        })}
      <Button
        onClick={() => {
          const section: StackSectionModel = {
            source: { resolver: 'dxos:markdown', guid: randomString() },
            object: {
              id: randomString(),
              content: '',
              title: '',
            },
          };
          sections.splice(sections.length, 0, section);
        }}
      >
        {t('add section label')}
      </Button>
    </article>
  );
};

export const StackMain = ({
  data: [stack, properties],
}: {
  data: [stack: StackModel, properties: StackProperties];
}) => {
  const { t } = useTranslation('dxos:stack');
  return (
    <Main.Content classNames='min-bs-[100vh] mli-auto max-is-[60rem] bg-white dark:bg-neutral-925'>
      <Input.Root>
        <Input.Label srOnly>{t('stack title label')}</Input.Label>
        <Input.TextInput
          variant='subdued'
          classNames='p-2'
          defaultValue={properties.title}
          onChange={({ target: { value } }) => (properties.title = value)}
        />
      </Input.Root>
      <List>
        <StackMainImpl sections={stack.sections} />
      </List>
    </Main.Content>
  );
};
