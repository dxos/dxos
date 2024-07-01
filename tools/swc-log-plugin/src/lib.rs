use std::collections::HashMap;
use std::ops::{Deref, DerefMut};
use std::sync::Arc;

use swc_core::{
    common::{DUMMY_SP, SourceMapper, Spanned},
    ecma::{
        ast::{
            BindingIdent, CallExpr, Expr, Id, Ident,
            ImportDecl, ImportSpecifier, Lit, ModuleExportName,
            ModuleItem, Pat, Program, Stmt,
            Str, VarDecl, VarDeclarator,
        },
        transforms::testing::test,
        visit::{as_folder, FoldWith, VisitMut, VisitMutWith},
    },
    plugin::{metadata::TransformPluginProgramMetadata, plugin_transform},
};
use swc_core::ecma::ast::{ExprOrSpread, NewExpr};
use swc_core::ecma::transforms::testing::Tester;
use swc_core::ecma::visit::Fold;

use config::Config;

use crate::config::TransformIdLookup;
use crate::param_transform::{add_meta_to_params, Metadata, TransformSpec};

mod param_transform;
mod config;

pub struct TransformVisitor {
    pub config: Config,
    pub metadata: Metadata,
    pub transform_spec_map: HashMap<Id, TransformSpec>,
    pub filename_id: Option<Ident>,
}

impl TransformIdLookup for TransformVisitor {
    fn get_transform_spec_for_id(&self, ident: &Ident) -> Option<&TransformSpec> {
        self.transform_spec_map.get(&ident.to_id())
    }
}

// A comprehensive list of possible visitor methods can be found here:
// https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html
impl VisitMut for TransformVisitor {
    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        n.visit_mut_children_with(self);

        let transform_spec = match self.get_config_for_call(&n.callee) {
            Some(transform_config) => transform_config,
            None => return,
        };

        add_meta_to_params(
            &self.filename_id,
            &self.metadata,
            transform_spec,
            &mut n.args,
            &n.span
        );
    }

    // Visit every import to collect identifiers for transform targets.
    fn visit_mut_import_decl(&mut self, n: &mut ImportDecl) {
        let package_name = format!("{}", &n.src.value);
        let transform_in_package: HashMap<&String, &TransformSpec> = HashMap::from_iter(self
            .config
            .to_transform
            .iter()
            .filter(|s| s.package == package_name)
            .map(|spec| (&spec.name, spec))
        );

        if transform_in_package.is_empty() {
            return;
        }
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
                    if let Some(transformed_symbol) = transform_in_package.get(&imported_symbol) {
                        self.transform_spec_map
                            .insert(named.local.to_id(), (**transformed_symbol).clone());
                    }
                }
                _ => {}
            }
        }
    }

    fn visit_mut_new_expr(&mut self, n: &mut NewExpr) {
        n.visit_mut_children_with(self);

        let transform_spec = match self.get_config_for_expression(&n.callee) {
            Some(transform_config) => transform_config,
            None => return,
        };

        let args: &mut Vec<ExprOrSpread> = match &mut n.args {
            Some(args) => args,
            None => {
                let vector = Vec::new();
                n.args = Some(vector);
                &mut n.args.clone().unwrap()
            },
        };

        add_meta_to_params(
            &self.filename_id,
            &self.metadata,
            transform_spec,
            args,
            &n.span
        );
    }

    fn visit_mut_program(&mut self, n: &mut Program) {
        let filename_id = Ident::new("__dxlog_file".into(), DUMMY_SP);

        let filename = match &self.config.filename {
            Some(filename) => filename.clone(),
            None => format!("{}", self.metadata.source_map.span_to_filename(n.span())),
        };

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
                    value: filename.into(),
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
}

/// An example plugin function with macro support.
/// `plugin_transform` macro interop pointers into deserialized structs, as well
/// as returning ptr back to host.
///
/// It is possible to opt out from macro by writing transform fn manually:
/// `__transform_plugin_process_impl
/// Refer swc_plugin_macro to see how does it work internally.
#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let config: Config = serde_json::from_str(&metadata.get_transform_plugin_config().expect("no config provided")).expect("failed to deserialize config");
    program.fold_with(&mut as_folder(TransformVisitor {
        config,
        metadata: Metadata { source_map: Arc::new(metadata.source_map) },
        transform_spec_map: HashMap::new(),
        filename_id: None,
    }))
}

fn create_test_config() -> Config {
    Config {
        filename: Some("input.js".into()),
        to_transform: vec![
            TransformSpec {
                name: "log".into(),
                package: "@dxos/log".into(),
                param_index: 2,
                include_args: false,
                include_call_site: true,
                include_scope: true,
            },
            TransformSpec {
                name: "invariant".into(),
                package: "@dxos/log".into(),
                param_index: 2,
                include_args: true,
                include_call_site: false,
                include_scope: true,
            },
            TransformSpec {
                name: "Context".into(),
                package: "@dxos/context".into(),
                param_index: 0,
                include_args: false,
                include_call_site: false,
                include_scope: false,
            },
        ],
    }
}

fn test_factory(t: &mut Tester) -> impl Fold {
    as_folder(TransformVisitor {
        filename_id: None,
        transform_spec_map: HashMap::new(),
        config: create_test_config(),
        metadata: Metadata { source_map: t.cm.clone() },
    })
}

/// Invoke `UPDATE=1 cargo test` to update expected test outputs.
test!(
    Default::default(),
    test_factory,
    single_log,
    r#"
        import { log } from '@dxos/log';
        log('test');
    "#
);

test!(
    Default::default(),
    test_factory,
    single_constructor,
    r#"
        import { Context } from '@dxos/context';
        const ctx = new Context();
    "#
);

test!(
    Default::default(),
    test_factory,
    multiple_log_statements,
    r#"
        import { log } from '@dxos/log';
        log('test1');

        some.other.code();
        //comment

        log('test2');
    "#
);

test!(
    Default::default(),
    test_factory,
    multiple_constructor_calls,
    r#"
        import { Context } from '@dxos/context';
        const ctx1 = new Context();

        some.other.code();
        //comment

        const ctx2 = new Context();
    "#
);

test!(
    Default::default(),
    test_factory,
    log_with_no_args,
    r#"
        import { log } from '@dxos/log';
        log();
    "#
);

test!(
    Default::default(),
    test_factory,
    log_with_context,
    r#"
        import { log } from '@dxos/log';
        log('foo', { key: 'value' });
    "#
);

test!(
    Default::default(),
    test_factory,
    log_levels,
    r#"
        import { log } from '@dxos/log';
        log('default');
        log.debug('debug');
        log.info('info');
        log.warn('warn');
        log.error('error');
        log.catch(err);
    "#
);

test!(
    Default::default(),
    test_factory,
    ignores_imports_from_other_modules,
    r#"
        import { log } from 'debug';
        import { Context } from 'bontext';
        log('test');
        new Context();
    "#
);

test!(
    Default::default(),
    test_factory,
    ignores_other_log_functions,
    r#"
        const log = () => {};
        log('test');
    "#
);

test!(
    Default::default(),
    test_factory,
    import_renames,
    r#"
        import { log as dxosLog } from '@dxos/log';
        import { Context as Ctx } from '@dxos/context';
        dxosLog('test');
        dxosLog.debug('debug');
        new Ctx();
    "#
);

test!(
    Default::default(),
    test_factory,
    two_log_imports,
    r#"
        import { log as dxosLog } from '@dxos/log';
        import { log } from 'debug';
        dxosLog('test 1');
        log('test 2');
    "#
);

test!(
    Default::default(),
    test_factory,
    two_log_imports_2,
    r#"
        import { log } from '@dxos/log';
        import { log as debugLog } from 'debug';
        log('test 1');
        debugLog('test 2');
    "#
);

test!(
    Default::default(),
    test_factory,
    include_args_true,
    r#"
        import { invariant } from '@dxos/log';
        invariant(true);
    "#
);

test!(
    Default::default(),
    test_factory,
    ignores_call_sites_where_argument_was_provided,
    r#"
        import { log } from '@dxos/log';
        import { Context } from '@dxos/context';
        log("Hello", {}, { customMeta: 42 });
        const ctx1 = new Context({ customArg: 'foo' });
    "#
);