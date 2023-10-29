//
// Copyright 2023 DXOS.org
//

import { type Icon, Circle } from '@phosphor-icons/react';
import React from 'react';

import { Input, List, ListItem } from '@dxos/react-ui';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Serializable.
export type PluginDef = {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  Icon?: Icon;
};

export type GalleryProps = {
  plugins?: PluginDef[];
  onChange?: (id: string, enabled: boolean) => void;
};

const styles = {
  highlight: 'hover:bg-neutral-100 dark:hover:bg-neutral-900',
};

export const Gallery = ({ plugins = [], onChange }: GalleryProps) => {
  return (
    <div className={mx('flex flex-col w-full overflow-x-hidden overflow-y-scroll', inputSurface)}>
      <List>
        {plugins.map(({ id, name, enabled, Icon = Circle }) => (
          <ListItem.Root
            key={id}
            classNames={mx('flex is-full items-center cursor-pointer', styles.highlight)}
            onClick={() => onChange?.(id, !enabled)}
          >
            <ListItem.Endcap classNames={'items-center mr-4'}>
              <Icon className={getSize(6)} />
            </ListItem.Endcap>
            <ListItem.Heading classNames='flex grow truncate items-center'>{name ?? id}</ListItem.Heading>
            <ListItem.Endcap classNames='items-center'>
              <Input.Root>
                <Input.Checkbox checked={!!enabled} onCheckedChange={() => onChange?.(id, !enabled)} />
              </Input.Root>
            </ListItem.Endcap>
          </ListItem.Root>
        ))}
      </List>
    </div>
  );
};
