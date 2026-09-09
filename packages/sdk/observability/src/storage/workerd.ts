//
// Copyright 2026 DXOS.org
//

// A worker reports on behalf of a deployment, not a person: there is no installation, no opt-out,
// and nothing to persist. Every store is a no-op and every read answers "unset".

export const showObservabilityBanner = async (_namespace: string, _bannercb: (input: string) => void) => {};

export const isObservabilityDisabled = async (_namespace: string): Promise<boolean> => false;

export const getInstallationId = async (_namespace: string): Promise<string | undefined> => undefined;

export const getAliasedDid = async (_namespace: string): Promise<string | undefined> => undefined;

export const storeAliasedDid = async (_namespace: string, _did: string): Promise<void> => {};

export const storeObservabilityDisabled = async (_namespace: string, _value: boolean): Promise<void> => {};

export const getObservabilityGroup = async (_namespace: string): Promise<string | undefined> => undefined;

export const storeObservabilityGroup = async (_namespace: string, _value: string): Promise<void> => {};

export const getOtelLogLevel = async (_namespace: string): Promise<string | null> => null;

export const storeOtelLogLevel = async (_namespace: string, _value: string | null): Promise<void> => {};
