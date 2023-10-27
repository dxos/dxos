//
// Copyright 2022 DXOS.org
//

import { Recycle, X } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { type TypedObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type FrameRuntime } from '@dxos/kai-frames';
import { EditableObjectList } from '@dxos/mosaic';
import { ShowDeletedOption, useQuery } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { useAppRouter } from '../../hooks';

export enum ObjectActionType {
  SELECT = 1,
  DELETE = 2,
  RESTORE = 3,
}

/**
 * @deprecated
 */
// TODO(burdon): Change to Intent.
export type ObjectAction = {
  type: ObjectActionType;
  object: TypedObject | undefined; // TODO(burdon): ID not object.
};

export type ObjectListProps<T extends TypedObject> = {
  frameDef: FrameRuntime<T>;
  showDeleted?: boolean;
  onAction?: (action: ObjectAction) => void;
};

export const ObjectList = <T extends TypedObject>({ frameDef, showDeleted, onAction }: ObjectListProps<T>) => {
  const { space, frame, objectId } = useAppRouter();
  const objects = useQuery(
    space,
    frameDef.filter?.(),
    showDeleted ? { deleted: ShowDeletedOption.SHOW_DELETED } : undefined,
  );
  if (!space || !frame || !frameDef.filter) {
    return null;
  }

  const handleCreate = async () => {
    invariant(frameDef.onCreate);
    const object = await frameDef.onCreate(space);
    onAction?.({ type: ObjectActionType.SELECT, object });
    return object.id;
  };

  const handleUpdate = async (objectId: string, text: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object && frameDef.title) {
      (object as any)[frameDef.title] = text;
    }
  };

  const handleSelect = (objectId: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object) {
      onAction?.({ type: ObjectActionType.SELECT, object });
    }
  };

  const Icon = frame!.runtime.Icon;

  const Action: FC<{ object: T }> = ({ object }) => {
    const Icon = object.__deleted ? Recycle : X;

    return (
      <Button
        variant='ghost'
        title={object.__deleted ? 'Delete' : 'Restore'}
        onClick={() =>
          onAction?.({ type: object.__deleted ? ObjectActionType.RESTORE : ObjectActionType.DELETE, object })
        }
      >
        <Icon className={getSize(4)} />
      </Button>
    );
  };

  // TODO(burdon): Create hint if list is empty.
  return (
    <EditableObjectList<T>
      objects={objects}
      selected={objectId}
      Icon={Icon}
      Action={Action}
      getTitle={(object) => (frameDef.title ? object[frameDef.title] : undefined)}
      onSelect={handleSelect}
      onCreate={frameDef.onCreate ? handleCreate : undefined}
      onUpdate={handleUpdate}
    />
  );
};
