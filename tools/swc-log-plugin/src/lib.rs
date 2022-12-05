use std::{borrow::Borrow, sync::Arc};

use swc_core::{ecma::{
    ast::{Program, Ident, CallExpr, Expr, Callee, ObjectLit, ExprOrSpread, PropOrSpread, Prop, KeyValueProp, PropName, Lit, Str, Number, ThisExpr, ArrowExpr, Param, Pat, BindingIdent},
    transforms::testing::test,
    visit::{as_folder, FoldWith, VisitMut, VisitMutWith}, atoms::Atom,
}, common::{DUMMY_SP, SourceMapper, SourceMap, FilePathMapping}, plugin::proxies::PluginSourceMapProxy};
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};
use swc_atoms::{JsWord, js_word};
use swc_common::{
    sync::Lrc,
};

pub struct TransformVisitor {
    pub source_map: Lrc<dyn SourceMapper>,
}

impl TransformVisitor {
    fn is_log_callee(&self, callee: &Callee) -> bool {
        let id_log: JsWord = "log".into();

        match callee {
            Callee::Expr(expr) => match &**expr {
                Expr::Ident(ident) => ident.sym == id_log,
                _ => false,
            },
            _ => false,
        }
    }
}

impl VisitMut for TransformVisitor {
    // Implement necessary visit_mut_* methods for actual custom transform.
    // A comprehensive list of possible visitor methods can be found here:
    // https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html


    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        n.visit_mut_children_with(self);

        if !self.is_log_callee(&n.callee) {
            return;
        }

        if n.args.len() <= 1 {
            // Push `context` argument.
            n.args.push(ExprOrSpread {
                spread: None,
                expr: Box::new(Expr::Object(ObjectLit {
                    span: DUMMY_SP,
                    props: vec![],
                })),
            });
        }

        if n.args.len() == 2 {
          let filename = self.source_map.span_to_filename(n.span);
          let line = self.source_map.span_to_lines(n.span).unwrap().lines[0].line_index + 1;

          // Push `meta` argument.
          n.args.push(ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Object(ObjectLit {
                span: DUMMY_SP,
                props: vec![
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident(Ident::new("file".into(), DUMMY_SP)),
                        value: Box::new(Expr::Lit(Lit::Str(Str {
                            span: DUMMY_SP,
                            value: format!("{filename}").into(),
                            raw: None,
                        }))),
                    }))),
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident(Ident::new("line".into(), DUMMY_SP)),
                        value: Box::new(Expr::Lit(Lit::Num(Number {
                            span: DUMMY_SP,
                            value: line as f64,
                            raw: None,
                        }))),
                    }))),
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident(Ident::new("scope".into(), DUMMY_SP)),
                        value: Box::new(Expr::This(ThisExpr {
                            span: DUMMY_SP,
                        })),
                    }))),
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident(Ident::new("callSite".into(), DUMMY_SP)),
                        value: Box::new(Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![
                                Pat::Ident(BindingIdent {
                                    id: Ident::new("f".into(), DUMMY_SP),
                                    type_ann: None,
                                }),
                                Pat::Ident(BindingIdent {
                                    id: Ident::new("a".into(), DUMMY_SP),
                                    type_ann: None,
                                }),
                            ],
                            body: swc_core::ecma::ast::BlockStmtOrExpr::Expr(Box::new(Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(Ident::new("f".into(), DUMMY_SP)))),
                                args: vec![
                                    swc_core::ecma::ast::ExprOrSpread {
                                        spread: Some(DUMMY_SP),
                                        expr: Box::new(Expr::Ident(Ident::new("a".into(), DUMMY_SP))),
                                    },
                                ],
                                type_args: None,
                            }))),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None
                        })),
                    }))),
                ],
            })),
        });  
        }
    }
}

/// An example plugin function with macro support.
/// `plugin_transform` macro interop pointers into deserialized structs, as well
/// as returning ptr back to host.
///
/// It is possible to opt out from macro by writing transform fn manually
/// if plugin need to handle low-level ptr directly via
/// `__transform_plugin_process_impl(
///     ast_ptr: *const u8, ast_ptr_len: i32,
///     unresolved_mark: u32, should_enable_comments_proxy: i32) ->
///     i32 /*  0 for success, fail otherwise.
///             Note this is only for internal pointer interop result,
///             not actual transform result */`
///
/// This requires manual handling of serialization / deserialization from ptrs.
/// Refer swc_plugin_macro to see how does it work internally.
#[plugin_transform]
pub fn process_transform(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut as_folder(TransformVisitor {
        source_map: Lrc::new(_metadata.source_map),
    }))
}

// An example to test plugin transform.
// Recommended strategy to test plugin's transform is verify
// the Visitor's behavior, instead of trying to run `process_transform` with mocks
// unless explicitly required to do so.
test!(
    Default::default(),
    |t| as_folder(TransformVisitor {
        source_map: t.cm.clone(),
    }),
    boo,
    // Input codes
    r#"
        import { log } from '@dxos/log';
        log('test');
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from '@dxos/log';
        log('test', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
    "#
);