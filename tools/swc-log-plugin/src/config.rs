use serde::Deserialize;
use swc_core::ecma::ast::{Callee, Expr, Ident, MemberProp};

use crate::param_transform::TransformSpec;

#[derive(Clone, Debug, Deserialize)]
pub struct Config {
    pub filename: Option<String>,
    pub to_transform: Vec<TransformSpec>,
}

pub trait TransformIdLookup {
    fn get_transform_spec_for_id(&self, ident: &Ident) -> Option<&TransformSpec>;

    fn get_config_for_call(&self, callee: &Callee) -> Option<&TransformSpec> {
        match callee {
            Callee::Expr(expr) => self.get_config_for_expression(expr),
            _ => None,
        }
    }

    fn get_config_for_expression(&self, expr: &Box<Expr>) -> Option<&TransformSpec> {
        match &**expr {
            Expr::Ident(ident) => self.get_transform_spec_for_id(ident),
            Expr::Member(member) => match (&*member.obj, &member.prop) {
                (Expr::Ident(obj), MemberProp::Ident(_prop)) => self.get_transform_spec_for_id(obj),
                _ => None,
            },
            _ => None,
        }
    }
}