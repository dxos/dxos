//
// Copyright 2026 DXOS.org
//

// Static imports so Vite resolves asset URLs at build time.
import gong1 from '../../assets/instrument/gongs-1.m4a?url';
import gong2 from '../../assets/instrument/gongs-2.m4a?url';
import fireplace from '../../assets/nature/fireplace.m4a?url';
import ocean from '../../assets/nature/ocean.m4a?url';
import rain from '../../assets/nature/rain.m4a?url';
import stream from '../../assets/nature/stream.m4a?url';
import thunder from '../../assets/nature/thunder.m4a?url';

export const SAMPLE_URLS: Record<string, string> = {
  fireplace,
  ocean,
  rain,
  stream,
  thunder,
  gong1,
  gong2,
};
