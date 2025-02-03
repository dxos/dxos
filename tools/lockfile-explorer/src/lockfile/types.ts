
export type PackageName = string & { __PackageName: never };
/**
 * @example '^19.7.2'
 */
export type VersionSpecifier = string & { __VersionSpecifier: never };

/**
 * @example '19.7.2'
 */
export type Version = string & { __Version: never };

/**
 * @example '1.2.3'
 * @example '3.22.3(zod@3.22.4)'
 */
export type VersionId = string & { __VersionId: never };

/**
 * @example '@nx/js@19.7.2
 * @example 'zod-to-json-schema@3.22.3(zod@3.22.4)
 */
export type PackageId = string & { __PackageId: never };

export type PackagePath = string & { __PackagePath: never };

export type Lockfile = {
  lockfileVersion: string;
  settings: {
    autoInstallPeers: boolean;
    excludeLinksFromLockfile: boolean;
  };
  overrides: Record<PackageName, VersionSpecifier>;
  pnpmfileChecksum: string;
  patchedDependencies: Record<
    PackageId,
    {
      hash: string;
      path: string;
    }
  >;
  importers: {
    [packagePath: PackagePath]: {
      dependencies?: Record<
        PackageName,
        {
          specifier: VersionSpecifier;
          version: VersionId;
        }
      >;
      optionalDependencies?: Record<
        PackageName,
        {
          specifier: VersionSpecifier;
          version: VersionId;
        }
      >;
      devDependencies?: Record<
        PackageName,
        {
          specifier: VersionSpecifier;
          version: VersionId;
        }
      >;
    };
  };
  packages: Record<
    PackageId,
    {
      resolution: {
        integrity: string;
      };
      engines: unknown;
      hasBin?: boolean;
      deprecated?: string;
      peerDependencies?: Record<PackageName, VersionSpecifier>;
      peerDependenciesMeta?: Record<PackageName, unknown>;
    }
  >;
  snapshots: Record<
    PackageId,
    {
      dependencies?: Record<PackageName, VersionId>;
      devDependencies?: Record<PackageName, VersionId>;
      optionalDependencies?: Record<PackageName, VersionId>;
      transitivePeerDependencies?: PackageName[];
    }
  >;
};

export type PackageIndex = {
  packages: Record<
    PackageName,
    {
      versions: Record<
        VersionId,
        {
          dependents: PackageId[];
          importers: PackagePath[];
        }
      >;
    }
  >;
};