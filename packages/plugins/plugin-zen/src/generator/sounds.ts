//
// Copyright 2026 DXOS.org
//

// Static imports so Vite resolves asset URLs at build time.
import gong1 from '../../media/instrument/gongs-1.m4a?url';
import gong2 from '../../media/instrument/gongs-2.m4a?url';
import fireplace from '../../media/nature/fireplace.m4a?url';
import ocean from '../../media/nature/ocean.m4a?url';
import rain from '../../media/nature/rain.m4a?url';
import stream from '../../media/nature/stream.m4a?url';
import thunder from '../../media/nature/thunder.m4a?url';

export const SAMPLE_URLS: Record<string, string> = {
  fireplace,
  ocean,
  rain,
  stream,
  thunder,
  gong1,
  gong2,
};
