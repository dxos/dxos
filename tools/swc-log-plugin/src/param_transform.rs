use std::ops::{Deref, DerefMut};
use std::sync::Arc;

use serde::Deserialize;
use swc_core::common::{DUMMY_SP, SourceMapper, Span, Spanned};
use swc_core::ecma::ast::{ArrayLit, ArrowExpr, BindingIdent, Callee, CallExpr, Expr, ExprOrSpread, Ident, KeyValueProp, Lit, Number, ObjectLit, Pat, Prop, PropName, PropOrSpread, Str, ThisExpr, UnaryExpr, UnaryOp};

pub struct Metadata {
    pub source_map: Arc<dyn SourceMapper>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TransformSpec {
    pub name: String,
    pub package: String,
    pub param_index: usize,
    pub include_args: bool,
    pub include_call_site: bool,
    pub include_scope: bool,
}

pub fn add_meta_to_params(
    filename_id: &Option<Ident>,
    metadata: &Metadata,
    transform_spec: &TransformSpec,
    args: &mut Vec<ExprOrSpread>,
    span: &Span,
) {
    if transform_spec.param_index < args.len() {
        // The argument was provided manually.
        return;
    }
    while args.len() < transform_spec.param_index {
        args.push(ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Unary(UnaryExpr {
                op: UnaryOp::Void,
                span: DUMMY_SP,
                arg: Box::new(Expr::Lit(Lit::Num(Number {
                    span: DUMMY_SP,
                    value: 0.0,
                    raw: None,
                }))),
            })),
        });
    }
    let meta = ExprOrSpread {
        spread: None,
        expr: Box::new(Expr::Object(ObjectLit {
            span: DUMMY_SP,
            props: create_meta_props(metadata, filename_id, transform_spec, args, span),
        })),
    };
    args.push(meta);
}

fn create_meta_props(
    metadata: &Metadata,
    filename_id: &Option<Ident>,
    config: &TransformSpec,
    args: &mut Vec<ExprOrSpread>,
    span: &Span,
) -> Vec<PropOrSpread> {
    let span_lines = metadata.source_map.deref().span_to_lines(*span);
    let line = match span_lines {
        Ok(span_lines) => span_lines.lines[0].line_index + 1,
        Err(_) => 0,
    };

    let mut props = vec![];

    if let Some(filename_id) = &filename_id {
        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(Ident::new("F".into(), DUMMY_SP)),
            value: Box::new(Expr::Ident(filename_id.clone())),
        }))));
    }
    props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
        key: PropName::Ident(Ident::new("L".into(), DUMMY_SP)),
        value: Box::new(Expr::Lit(Lit::Num(Number {
            span: DUMMY_SP,
            value: line as f64,
            raw: None,
        }))),
    }))));
    if config.include_scope {
        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(Ident::new("S".into(), DUMMY_SP)),
            value: Box::new(Expr::This(ThisExpr { span: DUMMY_SP })),
        }))));
    }
    if config.include_call_site {
        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(Ident::new("C".into(), DUMMY_SP)),
            value: Box::new(Expr::Arrow(create_call_site_arrow())),
        }))));
    }
    if config.include_args {
        let arg_snippets = args.iter().map(|a| {
            metadata
                .deref()
                .source_map
                .span_to_snippet(a.span())
                .unwrap_or("".into())
        });

        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(Ident::new("A".into(), DUMMY_SP)),
            value: Box::new(Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: arg_snippets
                    .map(|snippet| {
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Lit(Lit::Str(Str {
                                span: DUMMY_SP,
                                value: snippet.into(),
                                raw: None,
                            }))),
                        })
                    })
                    .collect(),
            })),
        }))));
    }

    props
}

fn create_call_site_arrow() -> ArrowExpr {
    let id_fn = Ident::new("f".into(), DUMMY_SP);
    let id_args = Ident::new("a".into(), DUMMY_SP);
    ArrowExpr {
        span: DUMMY_SP,
        params: vec![
            Pat::Ident(BindingIdent {
                id: id_fn.clone(),
                type_ann: None,
            }),
            Pat::Ident(BindingIdent {
                id: id_args.clone(),
                type_ann: None,
            }),
        ],
        body: Box::new(swc_core::ecma::ast::BlockStmtOrExpr::Expr(Box::new(
            Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Ident(id_fn))),
                args: vec![ExprOrSpread {
                    spread: Some(DUMMY_SP),
                    expr: Box::new(Expr::Ident(id_args)),
                }],
                type_args: None,
            }),
        ))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
    }
}