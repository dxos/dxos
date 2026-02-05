//
// Copyright 2025 DXOS.org
//

/**
 * Creates a unique filename.
 */
export const createFilename = ({
  parts = [],
  ext,
  date = new Date(),
}: {
  parts?: string[];
  ext?: string;
  date?: Date;
}) => [date.toISOString().replace(/[:.]/g, '-'), ...parts].join('_') + (ext ? `.${ext}` : '');
