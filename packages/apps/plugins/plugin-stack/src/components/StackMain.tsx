//
// Copyright 2023 DXOS.org
//

import React, { Fragment, useEffect, useMemo, useState } from 'react';

import { Button, useTranslation, randomString } from '@dxos/aurora';
import { ObservableArray, subscribe } from '@dxos/observable-object';
import { Surface } from '@dxos/react-surface';

import { StackModel, StackProperties, StackSectionModel, StackSections } from '../props';

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({ sections }: { sections: StackSections }) => {
  const { t } = useTranslation('dxos:stack');
  const [_, setIter] = useState([]);
  useEffect(() => {
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
  const sections = useMemo(() => {
    if (subscribe in stack.sections) {
      return stack.sections as ObservableArray<StackSectionModel>;
    } else {
      return new ObservableArray<StackSectionModel>(...stack.sections);
    }
  }, [stack]);

  return <StackMainImpl sections={sections} />;
};
