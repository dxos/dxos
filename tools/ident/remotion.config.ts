import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');

// The DXOS trail is WebGL; headless Chrome's default GL backend cannot run its float-texture shaders.
Config.setChromiumOpenGlRenderer('angle');
