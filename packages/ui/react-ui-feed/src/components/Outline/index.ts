//
// Copyright 2026 DXOS.org
//

// The rail's HOME is the feed (SPEC F-6.4) and its IMPLEMENTATION is react-ui-components, because
// plugin-assistant is publishable and this package is not yet: a public package may not depend on a
// private one, so the dependency has to point at the public home until react-ui-feed publishes —
// then the source moves here and this file becomes the implementation.
export { Outline, type OutlineMarker, type OutlineProps } from '@dxos/react-ui-components';
