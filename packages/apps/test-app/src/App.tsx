import React from "react";
import { Welcome } from "./Welcome";
import {
  GenericFallback,
  ResetDialog,
  ThemeProvider,
  appkitTranslations,
} from "@dxos/react-appkit";
import {
  ClientProvider,
  Config,
  Dynamics,
  Local,
  Defaults,
} from "@dxos/react-client";
import { ErrorBoundary } from "./ErrorBoundary";

import "./index.css";

// Dynamics allows configuration to be supplied by the hosting KUBE.
const config = async () => new Config(await Dynamics(), Local(), Defaults());

export const App = () => {
  return (
    <ThemeProvider
      appNs="test-app"
      resourceExtensions={[appkitTranslations]}
      fallback={<GenericFallback />}
    >
      <ErrorBoundary
        fallback={({ error }) => <ResetDialog error={error} config={config} />}
      >
        <ClientProvider
          config={config}
          fallback={GenericFallback}
          onInitialized={async (client) => {
            const searchParams = new URLSearchParams(location.search);
            if (
              !client.halo.identity.get() &&
              !searchParams.has("deviceInvitationCode")
            ) {
              await client.halo.createIdentity();
            }
          }}
        >
          <Welcome name="test-app" />
        </ClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
