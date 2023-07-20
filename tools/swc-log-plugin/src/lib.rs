use std::collections::HashMap;

use swc_core::{
    common::{sync::Lrc, SourceMapper, Spanned, DUMMY_SP},
    ecma::{
        ast::{
            ArrayLit, ArrowExpr, BindingIdent, CallExpr, Callee, Expr, ExprOrSpread, Id, Ident,
            ImportDecl, ImportSpecifier, KeyValueProp, Lit, MemberProp, ModuleExportName,
            ModuleItem, Number, ObjectLit, Param, Pat, Program, Prop, PropName, PropOrSpread, Stmt,
            Str, ThisExpr, UnaryExpr, UnaryOp, VarDecl, VarDeclarator,
        },
        atoms::JsWord,
        transforms::testing::{test, Tester},
        visit::{as_folder, Fold, FoldWith, VisitMut, VisitMutWith},
    },
    plugin::{metadata::TransformPluginProgramMetadata, plugin_transform},
};

pub struct TransformVisitor {
    pub config: Config,
    pub metadata: TransformPluginProgramMetadata,
    // pub source_map: Lrc<dyn SourceMapper>,
    pub to_transform: HashMap<Id, TransformedSymbol>,
    pub filename_id: Option<Ident>,
}

pub struct Config {
    symbols: Vec<TransformedSymbol>,
}

#[derive(Clone, Debug)]
pub struct TransformedSymbol {
    pub function: String,
    pub package: String,
    pub param_index: usize,
    pub include_args: bool,
    pub include_call_site: bool,
}

impl TransformVisitor {
    fn get_config_for_id(&self, ident: &Ident) -> Option<&TransformedSymbol> {
        self.to_transform.get(&ident.to_id())
    }

    fn get_config_for_call(&self, callee: &Callee) -> Option<&TransformedSymbol> {
        match callee {
            Callee::Expr(expr) => match &**expr {
                Expr::Ident(ident) => self.get_config_for_id(ident),
                Expr::Member(member) => match (&*member.obj, &member.prop) {
                    (Expr::Ident(obj), MemberProp::Ident(_prop)) => self.get_config_for_id(obj),
                    _ => None,
                },
                _ => None,
            },
            _ => None,
        }
    }

    fn create_meta(&self, config: &TransformedSymbol, n: &CallExpr) -> ExprOrSpread {
        let span_lines = self.metadata.source_map.span_to_lines(n.span);
        let line = match span_lines {
            Ok(span_lines) => span_lines.lines[0].line_index + 1,
            Err(_) => 0,
        };

        let mut props = vec![];

        if let Some(filename_id) = &self.filename_id {
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
        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(Ident::new("S".into(), DUMMY_SP)),
            value: Box::new(Expr::This(ThisExpr { span: DUMMY_SP })),
        }))));
        if config.include_call_site {
            props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(Ident::new("C".into(), DUMMY_SP)),
                value: Box::new(Expr::Arrow(create_call_site_arrow())),
            }))));
        }
        if config.include_args {
            let arg_snippets = n.args.iter().map(|a| {
                self.metadata
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

        ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Object(ObjectLit {
                span: DUMMY_SP,
                props,
            })),
        }
    }
}

impl VisitMut for TransformVisitor {
    // Implement necessary visit_mut_* methods for actual custom transform.
    // A comprehensive list of possible visitor methods can be found here:
    // https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html

    fn visit_mut_program(&mut self, n: &mut Program) {
        let filename_id = Ident::new("__dxlog_file".into(), DUMMY_SP);
        let filename_decl_stmt = Stmt::Decl(swc_core::ecma::ast::Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            kind: swc_core::ecma::ast::VarDeclKind::Var,
            declare: false,
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent {
                    id: filename_id.clone(),
                    type_ann: None,
                }),
                init: Some(Box::new(Expr::Lit(Lit::Str(Str {
                    span: DUMMY_SP,
                    value: format!("{}", self.metadata.source_map.span_to_filename(n.span()))
                        .into(),
                    raw: None,
                })))),
                definite: false,
            }],
        })));
        self.filename_id = Some(filename_id.clone());

        match n {
            Program::Module(m) => {
                m.body.insert(0, ModuleItem::Stmt(filename_decl_stmt));
            }
            Program::Script(s) => {
                s.body.insert(0, filename_decl_stmt);
            }
        }

        n.visit_mut_children_with(self);
    }

    // Visit every import to mark proper `log` identifiers.
    fn visit_mut_import_decl(&mut self, n: &mut ImportDecl) {
        let package_name = format!("{}", &n.src.value);
        let symbols_from_package: Vec<_> = self
            .config
            .symbols
            .iter()
            .filter(|s| s.package == package_name)
            .collect();

        if symbols_from_package.len() > 0 {
            for specifier in &mut n.specifiers {
                match specifier {
                    ImportSpecifier::Named(named) => {
                        let imported_name = if let Some(imported_name) = &named.imported {
                            match imported_name {
                                ModuleExportName::Ident(id) => id,
                                _ => continue,
                            }
                        } else {
                            &named.local
                        };

                        let imported_symbol = format!("{}", &imported_name.sym);
                        let transformed_symbol = symbols_from_package
                            .iter()
                            .find(|s| s.function == imported_symbol);

                        if let Some(transformed_symbol) = transformed_symbol {
                            self.to_transform
                                .insert(named.local.to_id(), (**transformed_symbol).clone());
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        n.visit_mut_children_with(self);

        let transform_config = match self.get_config_for_call(&n.callee) {
            Some(transform_config) => transform_config,
            None => return,
        };

        while n.args.len() < transform_config.param_index {
            n.args.push(ExprOrSpread {
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

        if n.args.len() <= transform_config.param_index {
            // Push `meta` argument.
            n.args.push(self.create_meta(transform_config, n));
        }
    }
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
                args: vec![swc_core::ecma::ast::ExprOrSpread {
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
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let config = Config {
        symbols: vec![
            TransformedSymbol {
                function: "log".into(),
                package: "@dxos/log".into(),
                param_index: 2,
                include_args: false,
                include_call_site: true,
            },
            TransformedSymbol {
                function: "invariant".into(),
                package: "@dxos/log".into(),
                param_index: 2,
                include_args: true,
                include_call_site: false,
            },
        ],
    };

    program.fold_with(&mut as_folder(TransformVisitor {
        config,
        metadata,
        // source_map: Lrc::new(metadata.source_map),
        to_transform: HashMap::new(),
        filename_id: None,
    }))
}

// fn test_factory(t: &mut Tester) -> impl Fold {
//     as_folder(TransformVisitor {
//         source_map: t.cm.clone(),
//         log_ids: vec![],
//     })
// }

// An example to test plugin transform.
// Recommended strategy to test plugin's transform is verify
// the Visitor's behavior, instead of trying to run `process_transform` with mocks
// // unless explicitly required to do so.
// test!(
//     Default::default(),
//     test_factory,
//     single_log,
//     // Input codes
//     r#"
//         import { log } from '@dxos/log';
//         log('test');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from '@dxos/log';
//         log('test', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     multiple_log_statements,
//     // Input codes
//     r#"
//         import { log } from '@dxos/log';
//         log('test1');

//         some.other.code();
//         //comment

//         log('test2');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from '@dxos/log';
//         log('test1', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });

//         some.other.code();
//         //comment

//         log('test2', {}, { file: "input.js", line: 8, scope: this, callSite: (f, a) => f(...a) });
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     log_with_no_args,
//     // Input codes
//     r#"
//         import { log } from '@dxos/log';
//         log();
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from '@dxos/log';
//         log({}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     log_with_context,
//     // Input codes
//     r#"
//         import { log } from '@dxos/log';
//         log('foo', { key: 'value' });
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from '@dxos/log';
//         log('foo', { key: 'value' }, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     log_levels,
//     // Input codes
//     r#"
//         import { log } from '@dxos/log';
//         log('default');
//         log.debug('debug');
//         log.info('info');
//         log.warn('warn');
//         log.error('error');
//         log.catch(err);
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from '@dxos/log';
//         log('default', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
//         log.debug('debug', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
//         log.info('info', {}, { file: "input.js", line: 5, scope: this, callSite: (f, a) => f(...a) });
//         log.warn('warn', {}, { file: "input.js", line: 6, scope: this, callSite: (f, a) => f(...a) });
//         log.error('error', {}, { file: "input.js", line: 7, scope: this, callSite: (f, a) => f(...a) });
//         log.catch(err, {}, { file: "input.js", line: 8, scope: this, callSite: (f, a) => f(...a) });
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     ignores_imports_from_other_modules,
//     // Input codes
//     r#"
//         import { log } from 'debug';
//         log('test');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from 'debug';
//         log('test');
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     ignores_other_log_functions,
//     // Input codes
//     r#"
//         const log = () => {};
//         log('test');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         const log = () => {};
//         log('test');
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     import_renames,
//     // Input codes
//     r#"
//         import { log as dxosLog } from '@dxos/log';
//         dxosLog('test');
//         dxosLog.debug('debug');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log as dxosLog } from '@dxos/log';
//         dxosLog('test', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
//         dxosLog.debug('debug', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     two_log_imports,
//     // Input codes
//     r#"
//         import { log as dxosLog } from '@dxos/log';
//         import { log } from 'debug';
//         dxosLog('test 1');
//         log('test 2');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log as dxosLog } from '@dxos/log';
//         import { log } from 'debug';
//         dxosLog('test 1', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
//         log('test 2');
//     "#
// );

// test!(
//     Default::default(),
//     test_factory,
//     two_log_imports_2,
//     // Input codes
//     r#"
//         import { log } from '@dxos/log';
//         import { log as debugLog } from 'debug';
//         log('test 1');
//         debugLog('test 2');
//     "#,
//     // Output codes after transformed with plugin
//     r#"
//         import { log } from '@dxos/log';
//         import { log as debugLog } from 'debug';
//         log('test 1', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
//         debugLog('test 2');
//     "#
// );
