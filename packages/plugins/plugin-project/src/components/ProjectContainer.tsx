//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Ref } from '@dxos/echo-schema';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { type DataType, type View } from '@dxos/schema';

import { ViewCollectionColumn } from './ViewCollectionColumn';

export const ProjectContainer = ({ object }: { object: DataType.Project; role: string }) => {
  return (
    <StackItem.Content>
      <Stack orientation='horizontal' size='contain' rail={false}>
        {(
          object.collections.filter((collection) => {
            if (!Ref.isRef(collection)) {
              return false;
            }
            const typeDXN = collection.dxn.asTypeDXN();
            return typeDXN?.type === 'dxos.org/type/View';
          }) as Ref<View>[]
        ).map((collection) => {
          return <ViewCollectionColumn key={collection.dxn.toString()} viewRef={collection} />;
        })}
      </Stack>
    </StackItem.Content>
  );
};
