# UI System

Here is how the UI system is organized into separate concerns:

## UI Primitives
> Lookless, pure components.
@dxos/react-{…}
packages/ui/primitives/react-{…}

## Aurora UI
> Look-ful, pure components.
@dxos/aurora
packages/ui/aurora

> theme elements and tokens that can be applied to primitives
@dxos/aurora-theme
packages/ui/aurora-theme

## Aurora X
> Other big pieces that are congruent with Aurora and separately packaged. e.g.: aurora-composer, aurora-datagrid.
> These are always provided in pure form, and with an "optional" ECHO adapter if necessary.
@dxos/aurora-* 
packages/ui/aurora-*

## Shell
> HALO Button and shell panels and popovers
@dxos/react-shell
packages/sdk/react-shell

## Shared 1P libs:
> Error boundaries and telemetry harnesses, logos and other visual and non-visual things shared between 1P apps
@dxos/react-appkit
packages/ui/react-appkit

## Extensible Composer
@braneframe/composer
packages/apps/composer-app

## Composer plugins
@braneframe/composer-plugin-*
packages/apps/composer-plugins/*

e.g.: packages/apps/composer-plugins/stack @braneframe/composer-plugin-stack
