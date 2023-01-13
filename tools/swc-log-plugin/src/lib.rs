use swc_core::{ecma::{
    ast::{Program, Ident, CallExpr, Expr, Callee, ObjectLit, ExprOrSpread, PropOrSpread, Prop, KeyValueProp, PropName, Lit, Str, Number, ThisExpr, ArrowExpr, Param, Pat, BindingIdent},
    transforms::testing::{test, Tester},
    visit::{as_folder, FoldWith, VisitMut, VisitMutWith},
}, common::{DUMMY_SP, SourceMapper}};
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};
use swc_atoms::JsWord;
use swc_common::{
    sync::Lrc,
};
use swc_ecma_visit::{Fold, swc_ecma_ast::{MemberProp, ImportDecl, ImportSpecifier, Id, ModuleExportName}};

pub struct TransformVisitor {
    pub source_map: Lrc<dyn SourceMapper>,
    pub log_ids: Vec<Id>,
}

const LOG_FUNCTION_NAME: &str = "log";
const LOG_PACKAGE_NAME: &str = "@dxos/log";

impl TransformVisitor {    
    fn is_log_ident(&self, ident: &Ident) -> bool {
        self.log_ids.contains(&ident.to_id())
    }

    fn is_log_callee(&self, callee: &Callee) -> bool {
        let id_log: JsWord = LOG_FUNCTION_NAME.into();

        match callee {
            Callee::Expr(expr) => match &**expr {
                Expr::Ident(ident) => self.is_log_ident(ident),
                Expr::Member(member) => match (&*member.obj, &member.prop) {
                    (Expr::Ident(obj), MemberProp::Ident(_prop)) => self.is_log_ident(obj),
                    _ => false,
                }
                _ => false,
            },
            _ => false,
        }
    }

    fn create_log_meta(&self,  n: &CallExpr) -> ExprOrSpread {
        let filename = self.source_map.span_to_filename(n.span);
        let line = self.source_map.span_to_lines(n.span).unwrap().lines[0].line_index + 1;

        ExprOrSpread {
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
                        value: Box::new(Expr::Arrow(create_call_site_arrow())),
                    }))),
                ],
            })),
        }
    }
}

impl VisitMut for TransformVisitor {
    // Implement necessary visit_mut_* methods for actual custom transform.
    // A comprehensive list of possible visitor methods can be found here:
    // https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html

    // Visit every import to mark proper `log` identifiers.
    fn visit_mut_import_decl(&mut self, n: &mut ImportDecl) {
        let log_package_name: JsWord = LOG_PACKAGE_NAME.into();
        let log_function_name: JsWord = LOG_FUNCTION_NAME.into();

        if n.src.value == log_package_name {
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

                        if imported_name.sym == log_function_name {
                            self.log_ids.push(named.local.to_id());
                        }
                    }
                    _ => {}
                }
            }
        }
        
    }


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

        if n.args.len() <= 2 {
          // Push `meta` argument.
          n.args.push(self.create_log_meta(n));  
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
        body: swc_core::ecma::ast::BlockStmtOrExpr::Expr(Box::new(Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(id_fn))),
            args: vec![
                swc_core::ecma::ast::ExprOrSpread {
                    spread: Some(DUMMY_SP),
                    expr: Box::new(Expr::Ident(id_args)),
                },
            ],
            type_args: None,
        }))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None
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
        log_ids: vec![],
    }))
}

fn test_factory(t: &mut Tester) -> impl Fold {
    as_folder(TransformVisitor {
        source_map: t.cm.clone(),
        log_ids: vec![],
    })
}

// An example to test plugin transform.
// Recommended strategy to test plugin's transform is verify
// the Visitor's behavior, instead of trying to run `process_transform` with mocks
// unless explicitly required to do so.
test!(
    Default::default(),
    test_factory,
    single_log,
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

test!(
    Default::default(),
    test_factory,
    multiple_log_statements,
    // Input codes
    r#"
        import { log } from '@dxos/log';
        log('test1');

        some.other.code();
        //comment

        log('test2');
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from '@dxos/log';
        log('test1', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });

        some.other.code();
        //comment

        log('test2', {}, { file: "input.js", line: 8, scope: this, callSite: (f, a) => f(...a) });
    "#
);

test!(
    Default::default(),
    test_factory,
    log_with_no_args,
    // Input codes
    r#"
        import { log } from '@dxos/log';
        log();
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from '@dxos/log';
        log({}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
    "#
);

test!(
    Default::default(),
    test_factory,
    log_with_context,
    // Input codes
    r#"
        import { log } from '@dxos/log';
        log('foo', { key: 'value' });
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from '@dxos/log';
        log('foo', { key: 'value' }, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
    "#
);

test!(
    Default::default(),
    test_factory,
    log_levels,
    // Input codes
    r#"
        import { log } from '@dxos/log';
        log('default');
        log.debug('debug');
        log.info('info');
        log.warn('warn');
        log.error('error');
        log.catch(err);
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from '@dxos/log';
        log('default', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
        log.debug('debug', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
        log.info('info', {}, { file: "input.js", line: 5, scope: this, callSite: (f, a) => f(...a) });
        log.warn('warn', {}, { file: "input.js", line: 6, scope: this, callSite: (f, a) => f(...a) });
        log.error('error', {}, { file: "input.js", line: 7, scope: this, callSite: (f, a) => f(...a) });
        log.catch(err, {}, { file: "input.js", line: 8, scope: this, callSite: (f, a) => f(...a) });
    "#
);

test!(
    Default::default(),
    test_factory,
    ignores_imports_from_other_modules,
    // Input codes
    r#"
        import { log } from 'debug';
        log('test');
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from 'debug';
        log('test');
    "#
);

test!(
    Default::default(),
    test_factory,
    ignores_other_log_functions,
    // Input codes
    r#"
        const log = () => {};
        log('test');
    "#,
    // Output codes after transformed with plugin
    r#"
        const log = () => {};
        log('test');
    "#
);


test!(
    Default::default(),
    test_factory,
    import_renames,
    // Input codes
    r#"
        import { log as dxosLog } from '@dxos/log';
        dxosLog('test');
        dxosLog.debug('debug');
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log as dxosLog } from '@dxos/log';
        dxosLog('test', {}, { file: "input.js", line: 3, scope: this, callSite: (f, a) => f(...a) });
        dxosLog.debug('debug', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
    "#
);

test!(
    Default::default(),
    test_factory,
    two_log_imports,
    // Input codes
    r#"
        import { log as dxosLog } from '@dxos/log';
        import { log } from 'debug';
        dxosLog('test 1');
        log('test 2');
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log as dxosLog } from '@dxos/log';
        import { log } from 'debug';
        dxosLog('test 1', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
        log('test 2');
    "#
);


test!(
    Default::default(),
    test_factory,
    two_log_imports_2,
    // Input codes
    r#"
        import { log } from '@dxos/log';
        import { log as debugLog } from 'debug';
        log('test 1');
        debugLog('test 2');
    "#,
    // Output codes after transformed with plugin
    r#"
        import { log } from '@dxos/log';
        import { log as debugLog } from 'debug';
        log('test 1', {}, { file: "input.js", line: 4, scope: this, callSite: (f, a) => f(...a) });
        debugLog('test 2');
    "#
);