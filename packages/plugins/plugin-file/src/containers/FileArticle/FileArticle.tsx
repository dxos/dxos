//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Next } from '@dxos/react-ui/next';
import { type File } from '@dxos/types';

import { Preview } from '#components';

import { useFileUrl } from '../../hooks/index.ts';

export type FileArticleProps = AppSurface.ObjectArticleProps<File.File>;

export const FileArticle = ({ role, subject: file, attendableId }: FileArticleProps) => {
  useObject(file);
  const rendered = useFileUrl(file);

  if (!rendered) {
    return null;
  }

  return (
    // No `dx-document`: that constrains content to the reading column, which is right for prose and
    // wrong for a preview — a PDF or image should use the full plank width.
    <Next.Panel.Root role={role}>
      <Preview.Root
        type={rendered.type}
        url={rendered.url}
        name={file.name}
        size={rendered.size}
        attendableId={attendableId}
      >
        <Next.Panel.Header>
          <Preview.Toolbar />
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Preview.Content />
        </Next.Panel.Body>
      </Preview.Root>
    </Next.Panel.Root>
  );
};

export default FileArticle;

FileArticle.displayName = 'FileArticle';
