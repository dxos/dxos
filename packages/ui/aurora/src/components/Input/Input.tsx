//
// Copyright 2023 DXOS.org
//
import React from 'react';

import {
  InputRoot,
  InputRootProps,
  Label as LabelPrimitive,
  LabelProps as LabelPrimitiveProps,
  Description as DescriptionPrimitive,
  DescriptionProps as DescriptionPrimitiveProps,
  ErrorMessage as ErrorMessagePrimitive,
  ErrorMessageProps as ErrorMessagePrimitiveProps,
  PinInput as PinInputPrimitive,
  PinInputProps as PinInputPrimitiveProps
} from '@dxos/react-input';

type RootProps = InputRootProps;

const Root = (props: RootProps) => {
  return <InputRoot {...props} />;
};

type LabelProps = LabelPrimitiveProps;

const Label = (props: LabelProps) => {
  return <LabelPrimitive {...props} />;
};

type DescriptionProps = DescriptionPrimitiveProps;

const Description = (props: DescriptionProps) => {
  return <DescriptionPrimitive {...props} />;
};

type ErrorMessageProps = ErrorMessagePrimitiveProps;

const ErrorMessage = (props: ErrorMessageProps) => {
  return <ErrorMessagePrimitive {...props} />;
};

type PinInputProps = PinInputPrimitiveProps;

const PinInput = (props: PinInputProps) => {
  return <PinInputPrimitive {...props} />;
};

export { Root, Root as InputRoot, Label, Description, ErrorMessage, PinInput };

export type { RootProps, RootProps as InputRootProps, LabelProps, DescriptionProps, ErrorMessageProps, PinInputProps };
