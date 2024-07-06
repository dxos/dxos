package org.dxos.psi

import com.intellij.lang.javascript.psi.JSReferenceExpression
import com.intellij.lang.javascript.psi.ecma6.TypeScriptNewExpression
import com.intellij.lang.javascript.psi.ecma6.TypeScriptSingleType
import com.intellij.lang.javascript.psi.ecmal4.JSClass
import com.intellij.lang.javascript.psi.resolve.JSResolveUtil
import com.intellij.psi.util.PsiTreeUtil

object PsiTypeResolver {
  fun resolveFromReference(reference: JSReferenceExpression?): JSClass? {
    val resolvedReceiver = reference?.resolve()
    val receiverType = JSResolveUtil.getElementJSType(resolvedReceiver);
    val sourceElement = receiverType?.sourceElement
    if (sourceElement is JSClass) {
      return sourceElement
    }
    val receiverDeclaration = receiverType?.source?.sourceElement as? TypeScriptSingleType
    val resolvedClass = (receiverDeclaration?.firstChild as? JSReferenceExpression)?.resolve()
    return resolvedClass as? JSClass ?: return null
  }

  fun resolveFromConstructor(newExpression: TypeScriptNewExpression?) = newExpression?.let {
    PsiTreeUtil.findChildOfType(it, JSReferenceExpression::class.java)
  }?.resolve() as? JSClass
}