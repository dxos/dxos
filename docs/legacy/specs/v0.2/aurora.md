# UI System

Here is how the UI system is organized into separate packages:

## UI Primitives
> Lookless, pure components.
@dxos/react-{…}
packages/ui/primitives/react-{…}

## DXOS UI
> Look-ful, pure components.
@dxos/react-ui
packages/ui/react-ui

> theme elements and tokens that can be applied to primitives
@dxos/ui-theme
packages/ui/react-ui-theme

## DXOS UI X
> Other big pieces that are congruent with DXOS UI and separately packaged. e.g.: react-ui-editor, react-ui-formgrid.
> These are always provided in pure form, and with an "optional" ECHO adapter if necessary.
@dxos/react-ui-* 
packages/ui/react-ui-*

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
