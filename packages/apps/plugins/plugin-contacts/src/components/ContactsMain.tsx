//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AddressBook as AddressBookType, Contact as ContactType } from '@braneframe/types';
import { getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Create outliner task list re selection.

// TODO(burdon): Master detail (same as Inbox); incl. selection, cursor navigation.
// TODO(burdon): Select/merge.
// TODO(burdon): Click to research, get image, etc. Scrape LinkedIn?
// TODO(burdon): Show messages for selection.
// TODO(burdon): Tags.

// TODO(burdon): Factor out.
export const styles = {
  selected: '!bg-primary-100 dark:!bg-primary-700',
  columnWidth: 'max-w-[400px]',
};

const byName =
  (direction = 1) =>
  ({ name: _a }: ContactType, { name: _b }: ContactType) => {
    const a = _a?.toLowerCase().replace(/\W/g, '');
    const b = _b?.toLowerCase().replace(/\W/g, '');
    return a === undefined || a < b ? -direction : b === undefined || a > b ? direction : 0;
  };

export type ContactsMainProps = {
  contacts: AddressBookType;
};

export const ContactsMain = ({ contacts }: ContactsMainProps) => {
  const space = getSpaceForObject(contacts);
  const objects = useQuery(space, ContactType.filter());
  objects.sort(byName());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className={mx('flex flex-col grow overflow-hidden')}>
        <div className={mx('flex flex-col overflow-y-scroll gap-1', styles.columnWidth)}>
          {objects.map((object) => (
            <div key={object.id} className='flex flex-col p-1 px-2 border border-neutral-300 rounded-md'>
              <div>{object.name}</div>
              <div>
                {object.identifiers.map(({ value }, i) => (
                  <span key={i} className='text-xs text-neutral-500'>
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>{objects?.length}</div>
      </div>
    </Main.Content>
  );
};
