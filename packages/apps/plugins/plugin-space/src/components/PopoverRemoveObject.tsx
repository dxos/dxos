//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Folder } from '@braneframe/types';
import { LayoutAction, parseIntentPlugin, parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { TypedObject, SpaceProxy, getSpaceForObject } from '@dxos/react-client/echo';
import { Button, Popover, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

// TODO: folder is of type `any` because it could be a `SpaceProxy` or `Folder` or... something else
export const PopoverRemoveObject = ({ object, folder: propsFolder }: { object: TypedObject; folder: any }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const deleteButton = useRef<HTMLButtonElement>(null);

  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  const handleDelete = useCallback(async () => {
    if (!(object instanceof TypedObject)) {
      return;
    }

    // If the item is active, navigate to "nowhere" to avoid navigating to a removed item
    if (layoutPlugin?.provides.layout.active === object.id) {
      await intentPlugin?.provides.intent.dispatch({
        action: LayoutAction.ACTIVATE,
        data: { id: undefined },
      });
    }

    // remove object from folder it's in
    if (propsFolder instanceof Folder) {
      const index = propsFolder.objects.indexOf(object);
      index !== -1 && propsFolder.objects.splice(index, 1);
    }

    const space = getSpaceForObject(object);

    // remove the folder from the root folder - may be handled by previous condition
    const folder = space?.properties[Folder.schema.typename];
    if (folder instanceof Folder) {
      const index = folder.objects.indexOf(object);
      index !== -1 && folder.objects.splice(index, 1);
    }

    // if the object is a folder, move the objects inside of it to the folder above it
    if (object instanceof Folder) {
      let parentFolder = propsFolder;
      if (propsFolder instanceof SpaceProxy) {
        parentFolder = propsFolder.properties[Folder.schema.typename];
      }
      object.objects.forEach((obj) => {
        parentFolder.objects.push(obj);
      });
    }

    // remove the object from the space
    if (space) {
      space.db.remove(object);
      return true;
    }
  }, [object]);

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
