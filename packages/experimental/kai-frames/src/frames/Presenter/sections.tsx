//
// Copyright 2022 DXOS.org
//

import { Article, Image, Trash } from '@phosphor-icons/react';
import React, { type FC } from 'react';
import urlJoin from 'url-join';

import { Document } from '@braneframe/types';
import { Composer } from '@dxos/react-ui-editor';
import { DocumentStack, File } from '@dxos/kai-types';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { type Config, useConfig } from '@dxos/react-client';
import { Text, type TypedObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { FilePreview } from '../../components';
import { useFrameContext } from '../../hooks';
import { type CustomStackAction, FileSelector } from '../Stack';

// TODO(burdon): Generalize with Stack.
export const sectionActions = (config: Config, section?: DocumentStack.Section) => {
  const insert = (stack: DocumentStack, section: DocumentStack.Section | undefined, object: TypedObject) => {
    const idx = section ? stack.sections.findIndex(({ id }) => id === section.id) : stack.sections.length;
    stack.sections.splice(idx, 0, new DocumentStack.Section({ object }));
  };

  const actions: CustomStackAction[][] = [
    [
      {
        id: Document.type.name,
        label: 'New slide',
        Icon: Article,
        onAction: (stack, section) => {
          insert(stack, section, new Document());
        },
      },
      {
        id: File.type.name,
        label: 'Image',
        Icon: Image,
        Dialog: FileSelector,
        onAction: (stack, section, object) => {
          const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object!.cid);
          const idx = section ? stack.sections.findIndex(({ id }) => id === section.id) : stack.sections.length;
          const document = new Document({ content: new Text(`![${object?.name}](${url})`, TextKind.PLAIN) });
          stack.sections.splice(idx, 0, new DocumentStack.Section({ object: document }));
        },
      },
    ],
  ];

  if (section) {
    actions.push([
      {
        id: 'delete',
        label: 'Delete',
        Icon: Trash,
        onAction: (stack, section) => {
          const idx = stack.sections.findIndex(({ id }) => id === section!.id);
          stack.sections.splice(idx, 1);
        },
      },
    ]);
  }

  return actions;
};

export const StackSection: FC<{ section: DocumentStack.Section }> = ({ section }) => {
  const config = useConfig();
  const identity = useIdentity();
  const { space } = useFrameContext();
  const { object } = section;

  switch (object.__typename) {
    case Document.type.name: {
      return (
        <Composer
          identity={identity}
          space={space}
          text={object.content}
          slots={{
            editor: {
              placeholder: 'Text...',
              spellCheck: false, // TODO(burdon): Config.
            },
          }}
        />
      );
    }

    case File.type.name: {
      return (
        <div className='flex w-full h-[400px]'>
          <FilePreview url={urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object.cid)} image />
        </div>
      );
    }

    default:
      return null;
  }
};
