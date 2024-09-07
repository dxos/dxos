//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';

export const defaultStyles = {
  markers: '',
  guides: '',
  nodes: '',
  links: '',
  linker: '',
  bullet: '',
};

export const defaultGraphStyles = mx([
  defaultStyles.guides,
  defaultStyles.nodes,
  defaultStyles.links,
  defaultStyles.bullet,
]);
