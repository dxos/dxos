//
// Copyright 2026 DXOS.org
//

import { Config } from '@remotion/cli/config';

// The ident lives beside autocue's DOM components, so the studio needs its entry point named.
Config.setEntryPoint('./src/components/Ident/remotion.ts');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');

// The DXOS trail is WebGL; headless Chrome's default GL backend cannot run its float-texture shaders.
Config.setChromiumOpenGlRenderer('angle');
