//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { FilePreview } from '#components';
import { File, FileCapabilities } from '#types';

export type FileArticleProps = AppSurface.ObjectArticleProps<File.File>;

export const FileArticle = ({ role, subject: file }: FileArticleProps) => {
  const resolvers = useCapabilities(FileCapabilities.UrlResolver);
  const [renderUrl, setRenderUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const { data } = file;
    if (data._tag === 'inline') {
      const url = URL.createObjectURL(new Blob([data.bytes as BlobPart], { type: file.type }));
      setRenderUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    // External URL: pass through `http(s):`/`data:`/`blob:` directly; otherwise dispatch to a resolver.
    let cancelled = false;
    let createdBlobUrl: string | undefined;

    if (/^(?:https?|data|blob):/i.test(data.url)) {
      setRenderUrl(data.url);
    } else {
      const resolver = resolvers.find((r) => r.test(data.url));
      if (!resolver) {
        setRenderUrl(undefined);
        return;
      }
      setRenderUrl(undefined);
      void resolver
        .resolve(data.url, file, getSpace(file))
        .then((url) => {
          if (cancelled) {
            if (url?.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
            return;
          }
          if (url?.startsWith('blob:')) {
            createdBlobUrl = url;
          }
          setRenderUrl(url);
        })
        .catch(() => {
          if (!cancelled) {
            setRenderUrl(undefined);
          }
        });
    }

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [file, file.data, file.type, resolvers]);

  if (!renderUrl) {
    return null;
  }

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <FilePreview type={file.type} url={renderUrl} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default FileArticle;
