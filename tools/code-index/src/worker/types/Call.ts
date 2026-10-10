//
// Copyright 2026 DXOS.org
//

import * as Term from './Term.ts';

/**
 * Calling a function type with argument types — shared by per-file inference and the cross-file
 * pass, which binds a deferred `returnOf` with exactly the rules the call site would have used.
 */

const isTypeParamAtTopLevel = (type: Term.Type, name: string): boolean =>
  (type.kind === 'param' && type.name === name) ||
  ((type.kind === 'union' || type.kind === 'intersection') &&
    type.members.some((member) => isTypeParamAtTopLevel(member, name)));

/** Call a function type with argument types: arity check, then generic inference. */
export const applyTypes = (callee: Term.Type, args: readonly Term.Type[]): Term.Type => {
  if (callee.kind !== 'function') {
    return Term.unresolved('callee-not-function');
  }
  const required = callee.params.filter((entry) => !entry.optional && !entry.rest).length;
  const hasRest = callee.params.some((entry) => entry.rest);
  if (args.length < required || (!hasRest && args.length > callee.params.length) || hasRest) {
    return Term.unresolved('call-arity');
  }
  if (callee.typeParams.length === 0) {
    return callee.returns;
  }
  const candidates = new Map<string, Array<{ type: Term.Type; topLevel: boolean }>>();
  for (const [index, arg] of args.entries()) {
    if (!unify(callee.params[index].type, arg, callee.typeParams, candidates, true)) {
      return Term.unresolved('generic-inference');
    }
  }
  const bindings = new Map<string, Term.Type>();
  for (const name of callee.typeParams) {
    const found = candidates.get(name) ?? [];
    if (found.length === 0) {
      bindings.set(name, Term.primitive('unknown'));
      continue;
    }
    const texts = new Set(found.map((candidate) => Term.text(Term.widen(candidate.type))));
    if (texts.size > 1 || found.some((candidate) => candidate.type.kind === 'unresolved')) {
      return Term.unresolved('generic-candidates');
    }
    const exact = new Set(found.map((candidate) => Term.text(candidate.type)));
    const widen = found.every((candidate) => candidate.topLevel) && !isTypeParamAtTopLevel(callee.returns, name);
    if (exact.size > 1 && !widen) {
      return Term.unresolved('generic-candidates');
    }
    bindings.set(name, widen ? Term.widen(found[0].type) : found[0].type);
  }
  return Term.instantiate(callee.returns, bindings);
};

/** Structural matching of a parameter type against an argument type, collecting candidates. */
const unify = (
  parameter: Term.Type,
  argument: Term.Type,
  typeParams: readonly string[],
  candidates: Map<string, Array<{ type: Term.Type; topLevel: boolean }>>,
  topLevel: boolean,
): boolean => {
  if (!typeParams.some((name) => Term.mentions(parameter, name))) {
    return true;
  }
  if (parameter.kind === 'param' && typeParams.includes(parameter.name)) {
    const list = candidates.get(parameter.name) ?? [];
    list.push({ type: argument, topLevel });
    candidates.set(parameter.name, list);
    return true;
  }
  if (
    parameter.kind === 'ref' &&
    argument.kind === 'ref' &&
    parameter.iri === argument.iri &&
    parameter.args.length === argument.args.length
  ) {
    return parameter.args.every((arg, index) => unify(arg, argument.args[index], typeParams, candidates, false));
  }
  if (parameter.kind === 'object' && argument.kind === 'object') {
    return parameter.properties.every((property) => {
      const match = argument.properties.find((candidate) => candidate.name === property.name);
      return (
        match !== undefined && !property.optional && unify(property.type, match.type, typeParams, candidates, false)
      );
    });
  }
  if (
    parameter.kind === 'function' &&
    argument.kind === 'function' &&
    parameter.typeParams.length === 0 &&
    argument.typeParams.length === 0
  ) {
    return (
      parameter.params.length === argument.params.length &&
      !Term.isPartial(argument) &&
      unify(parameter.returns, argument.returns, typeParams, candidates, false)
    );
  }
  return false;
};
