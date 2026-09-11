//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'account/Account': 'src/account/Account.ts',
    'app-framework/AppCapabilities': 'src/app-framework/AppCapabilities.ts',
    'app-framework/ObservabilityMapping': 'src/app-framework/ObservabilityMapping.ts',
    'app-framework/AppCapability': 'src/app-framework/AppCapability.ts',
    'app-graph/AppNode': 'src/app-graph/AppNode.ts',
    'app-graph/AppNodeMatcher': 'src/app-graph/AppNodeMatcher.ts',
    'app-graph/TypeSection': 'src/app-graph/TypeSection.ts',
    'app/GraphPath': 'src/app/GraphPath.ts',
    'app/NativeOAuth': 'src/app/NativeOAuth.ts',
    'app/NativePasskey': 'src/app/NativePasskey.ts',
    'app/NavigationResolver': 'src/app/NavigationResolver.ts',
    'app/NotFound': 'src/app/NotFound.ts',
    'app/Translations': 'src/app/Translations.ts',
    'app/UrlPath': 'src/app/UrlPath.ts',
    'app/UrlResolution': 'src/app/UrlResolution.ts',
    'echo/AppAnnotation': 'src/echo/AppAnnotation.ts',
    'echo/AppMigrations': 'src/echo/AppMigrations.ts',
    'echo/AppSpace': 'src/echo/AppSpace.ts',
    'echo/TypeOptions': 'src/echo/TypeOptions.ts',
    'operations/CollaborationOperation': 'src/operations/CollaborationOperation.ts',
    'operations/LayoutOperation': 'src/operations/LayoutOperation.ts',
    'operations/NavigationOperation': 'src/operations/NavigationOperation.ts',
    'operations/SettingsOperation': 'src/operations/SettingsOperation.ts',
    'types/CollectionModel': 'src/types/CollectionModel.ts',
    'types/ConnectorSync': 'src/types/ConnectorSync.ts',
    'app-framework/AppActivationEvents': 'src/app-framework/AppActivationEvents.ts',
    'echo/Query': 'src/echo/Query.ts',
    'sample/SampleSpace': 'src/sample/SampleSpace.ts',
    'types': 'src/types/index.ts',
    'testing': 'src/testing/index.ts',
    'ui': 'src/ui/index.ts',
    'app-graph/DeckSpec': 'src/app-graph/DeckSpec.ts',
  },
  jsx: 'react',
  test: { node: true },
});
