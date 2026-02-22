// Forked from @ch-ui/tailwind-tokens@2.8.1
// Original: https://github.com/ch-ui-dev/ch-ui/tree/main/packages/tailwind-tokens
// Required notice: Copyright (c) 2024, Will Shown <ch-ui@willshown.com>

import {
  TokenSet,
  Facet,
  facetSemanticValues,
  PhysicalLayer,
  SemanticLayer,
  SemanticValues,
  resolveNaming,
  resolveDefinition,
  seriesValues,
  variableNameFromValue,
  nameFromValue,
  Series,
  AliasLayer,
  Definitions,
} from '@ch-ui/tokens';

import type { ThemeConfig } from 'tailwindcss/plugin';

type OptionalConfig = { theme?: ThemeConfig };
type TwTheme = ThemeConfig;

type TwKey = keyof TwTheme;

export type TailwindAdapterFacet = {
  facet: string;
  disposition?: 'extend' | 'overwrite';
  tokenization?: 'keep-series' | 'omit-series' | 'recursive';
  seriesValueSeparator?: string;
};

export type TailwindAdapterConfig = Partial<
  Record<TwKey, TailwindAdapterFacet>
>;

type Mapping = Record<string, string | Record<string, string>>;

const defaultAdapterConfig = {} satisfies TailwindAdapterConfig;

const renderPhysicalMappings = (
  config: TailwindAdapterFacet,
  {
    conditions,
    series,
    namespace,
    definitions: layerDefinitions = {},
  }: PhysicalLayer<string, Series<any>>,
  semanticValues?: SemanticValues,
  ...ancestorDefinitions: Definitions[]
): Mapping =>
  Object.entries(conditions).reduce(
    (acc: Mapping, [conditionId, _statements]) =>
      Object.entries(series).reduce(
        (acc: Mapping, [seriesId, { [conditionId]: series }]) => {
          const resolvedSeries = resolveDefinition<Series<any>, Series<any>>(
            series!,
            'series',
            () => true,
            layerDefinitions,
            ...ancestorDefinitions,
          );
          const resolvedNaming = resolveNaming(resolvedSeries.naming);
          const tokenization = config.tokenization ?? 'keep-series';
          const separator = config.seriesValueSeparator ?? '-';
          if (tokenization === 'recursive') {
            acc[seriesId] = Array.from(
              seriesValues(resolvedSeries, semanticValues?.[seriesId]).keys(),
            ).reduce((acc: Record<string, string>, value) => {
              acc[
                `${nameFromValue(value, resolvedNaming)}`
              ] = `var(${variableNameFromValue(
                value,
                resolvedNaming,
                seriesId,
                namespace,
              )})`;
              return acc;
            }, {});
          } else {
            acc = {
              ...acc,
              ...Array.from(
                seriesValues(series!, semanticValues?.[seriesId]).keys(),
              ).reduce((acc, value) => {
                const tokenName =
                  tokenization === 'keep-series'
                    ? `${seriesId}${separator}${nameFromValue(
                        value,
                        resolvedNaming,
                      )}`
                    : nameFromValue(value, resolvedNaming);
                acc[tokenName] = `var(${variableNameFromValue(
                  value,
                  resolvedNaming,
                  seriesId,
                  namespace,
                )})`;
                return acc;
              }, {}),
            };
          }
          return acc;
        },
        acc,
      ),
    {},
  );

const renderSemanticMappings = (
  config: TailwindAdapterFacet,
  semantic?: SemanticLayer,
): Mapping => {
  if (!semantic) {
    return {};
  } else {
    const { conditions, sememes, namespace } = semantic;
    return Object.entries(conditions).reduce(
      (acc: Mapping, [conditionId, statements]) =>
        Object.keys(sememes).reduce((acc: Mapping, sememeName) => {
          acc[sememeName] = `var(--${namespace}${sememeName})`;
          return acc;
        }, acc),
      {},
    );
  }
};

const renderAliasMappings = (
  config: TailwindAdapterFacet,
  alias?: AliasLayer,
): Mapping => {
  if (!alias) {
    return {};
  } else {
    const { namespace, aliases } = alias;
    return Object.entries(aliases).reduce(
      (acc: Mapping, [sememeName, sememeAliases]) => {
        return Object.entries(sememeAliases).reduce(
          (acc, [conditionId, aliasNames]) => {
            return aliasNames.reduce((acc, aliasName) => {
              acc[aliasName] = `var(--${namespace}${aliasName})`;
              return acc;
            }, acc);
          },
          acc,
        );
      },
      {},
    );
  }
};

const renderTailwindFacet = (
  config: TailwindAdapterFacet,
  { physical, semantic, alias, definitions: facetDefinitions = {} }: Facet,
): Mapping => {
  const semanticValues = facetSemanticValues(semantic) as SemanticValues;
  // TODO(thure): Need case(s) for Tailwind's `fontSize`.
  return {
    ...renderPhysicalMappings(
      config,
      physical,
      semanticValues,
      facetDefinitions as Definitions,
    ),
    ...renderSemanticMappings(config, semantic as SemanticLayer),
    ...renderAliasMappings(config, alias),
  };
};

export default (
  tokensConfig: TokenSet,
  adapterConfig: TailwindAdapterConfig = defaultAdapterConfig,
): OptionalConfig['theme'] =>
  Object.entries(adapterConfig).reduce(
    (acc: OptionalConfig['theme'], entry) => {
      const [twKey, config] = entry as [TwKey, TailwindAdapterFacet];
      if (config.facet in tokensConfig) {
        const twFacet = renderTailwindFacet(config, tokensConfig[config.facet]);
        if (config.disposition === 'extend') {
          if (!acc) return { extend: { [twKey]: twFacet } };
          acc.extend ??= {};
          acc.extend[twKey] = twFacet;
        } else {
          if (!acc) return { [twKey]: twFacet };
          acc[twKey] = twFacet;
        }
      }
      return acc;
    },
    {},
  );
