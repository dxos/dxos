//
// Copyright 2023 DXOS.org
//

import React, { Fragment, useEffect, useState } from 'react';

import { Main, Input, List, Button, useTranslation, randomString } from '@dxos/aurora';
import { defaultBlockSeparator, mx } from '@dxos/aurora-theme';
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
        // todo(thure): This filter should be unnecessary; why is the first (or only?) value sometimes some sort of array-like object?
        .filter((section) => 'source' in section)
        .map((section, o) => {
          return (
            <Fragment key={section.source.guid}>
              <Surface role='section' data={section} />
            </Fragment>
          );
        })}
      <div role='none' className='p-4'>
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
      </div>
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
          classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
          defaultValue={properties.title}
          onChange={({ target: { value } }) => (properties.title = value)}
        />
      </Input.Root>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 opacity-50')} />
      <List>
        <StackMainImpl sections={stack.sections} />
      </List>
    </Main.Content>
  );
};
