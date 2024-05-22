//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { getSpaceProperty, FolderType } from '@braneframe/types';
import {
  NavigationAction,
  parseIntentPlugin,
  parseNavigationPlugin,
  useResolvePlugin,
  isIdActive,
} from '@dxos/app-framework';
import { type Expando } from '@dxos/echo-schema';
import { fullyQualifiedId, getSpace, isEchoObject } from '@dxos/react-client/echo';
import { Button, Popover, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const PopoverRemoveObject = ({ object, folder: propsFolder }: { object: Expando; folder?: FolderType }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const deleteButton = useRef<HTMLButtonElement>(null);

  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  const handleDelete = useCallback(async () => {
    if (!isEchoObject(object)) {
      return;
    }

    const objectId = fullyQualifiedId(object);
    // If the item is active, navigate to "nowhere" to avoid navigating to a removed item.
    if (isIdActive(navigationPlugin?.provides.location.active, objectId)) {
      await intentPlugin?.provides.intent.dispatch({
        action: NavigationAction.CLOSE,
        data: { activeParts: { main: [objectId], sidebar: [objectId], complementary: [objectId] } },
      });
    }

    const space = getSpace(object);

    // Remove object from folder it's in.
    const folder = propsFolder ?? getSpaceProperty<FolderType>(space, FolderType.typename);
    if (folder) {
      const index = folder.objects.indexOf(object);
      index !== -1 && folder.objects.splice(index, 1);
    }

    // If the object is a folder, move the objects inside of it to the folder above it.
    if (object instanceof FolderType && folder) {
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
