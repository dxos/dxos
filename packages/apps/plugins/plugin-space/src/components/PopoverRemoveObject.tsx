//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Folder } from '@braneframe/types';
import { NavigationAction, parseIntentPlugin, parseNavigationPlugin, useResolvePlugin } from '@dxos/app-framework';
import { TypedObject, getSpaceForObject } from '@dxos/react-client/echo';
import { Button, Popover, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const PopoverRemoveObject = ({ object, folder: propsFolder }: { object: TypedObject; folder?: Folder }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const deleteButton = useRef<HTMLButtonElement>(null);

  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  const handleDelete = useCallback(async () => {
    if (!(object instanceof TypedObject)) {
      return;
    }

    // If the item is active, navigate to "nowhere" to avoid navigating to a removed item.
    if (navigationPlugin?.provides.location.active === object.id) {
      await intentPlugin?.provides.intent.dispatch({
        action: NavigationAction.ACTIVATE,
        data: { id: undefined },
      });
    }

    const space = getSpaceForObject(object);

    // Remove object from folder it's in.
    const folder: Folder = propsFolder ?? space?.properties[Folder.schema.typename];
    if (folder) {
      const index = folder.objects.indexOf(object);
      index !== -1 && folder.objects.splice(index, 1);
    }

    // If the object is a folder, move the objects inside of it to the folder above it.
    if (object instanceof Folder && folder) {
      object.objects.forEach((obj) => {
        folder.objects.push(obj);
      });
    }

    // Remove the object from the space.
    if (space) {
      space.db.remove(object);
      return true;
    }
  }, [object]);

  // TODO(burdon): Remove popover and use toast/similar mechanism to deleting comments.
  return (
    <div role='none' className='p-1'>
      <p className='mlb-1 mli-2'>{t('delete object description', { ns: 'os' })}</p>
      <Popover.Close asChild>
        <Button
          ref={deleteButton}
          classNames='is-full'
          onClick={handleDelete}
          data-testid='spacePlugin.confirmDeleteObject'
        >
          {t('delete label', { ns: 'os' })}
        </Button>
      </Popover.Close>
    </div>
  );
};
