//
// Copyright 2023 DXOS.org
//

import { Files as FileIcon } from '@phosphor-icons/react';
import React from 'react';

import { File } from '@dxos/kai-types';

import { FrameRuntime } from '../../registry';

const FileFrame = React.lazy(() => import('./FileFrame'));
const FilePlugin = React.lazy(() => import('./FilePlugin'));

export const imageTypes = ['jpg', 'png', 'gif'];

// TODO(burdon): Wildcard?
// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept
export const defaultFileTypes = [...imageTypes, 'txt', 'md', 'pdf', 'zip', 'webloc'];

export const FileFrameRuntime: FrameRuntime<File> = {
  Icon: FileIcon,
  Component: FileFrame,
  Plugin: FilePlugin,
  title: 'name',
  filter: () => File.filter(),
};
