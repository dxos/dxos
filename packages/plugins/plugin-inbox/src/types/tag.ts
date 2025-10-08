//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Factor out.
export type Tag = {
  label: string;
  hue: string;
};

export const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);
