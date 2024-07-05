package org.dxos.navigation

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.lang.javascript.psi.JSCallExpression
import com.intellij.lang.javascript.psi.JSFunction
import com.intellij.lang.javascript.psi.JSReferenceExpression
import com.intellij.lang.javascript.psi.ecmal4.JSClass
import com.intellij.psi.PsiElement
import org.dxos.psi.PsiTypeResolver

class RealImplementationLocator(
  private val wrapperMethodHostClass: String,
  private val wrapperMethods: Array<String>,
  private val methodNameTransform: (String?) -> String,
) {
  fun createNavigationMarker(element: PsiElement): LineMarkerInfo<*>? {
    val file = element.containingFile.virtualFile
    if (file == null || file.fileType.isBinary) {
      return null
    }
    if (element !is JSCallExpression) {
      return null
    }
    val methodRef = element.methodExpression as? JSReferenceExpression ?: return null
    val receiver = methodRef.firstChild as? JSReferenceExpression ?: return null
    if (methodRef.referenceName !in wrapperMethods) {
      return null
    }
    val resolvedFunction = methodRef.resolve()
    if (resolvedFunction !is JSFunction) {
      return null
    }
    val containingClass = resolvedFunction.context
    if (containingClass !is JSClass || containingClass.name != wrapperMethodHostClass) {
      return null
    }
    val typeScriptClass = PsiTypeResolver.resolveFromReference(receiver) ?: return null
    val implementationName = methodNameTransform(methodRef.referenceName)
    val implementationMethod = typeScriptClass.functions.find { it.name == implementationName }
    if (implementationMethod == null) {
      return null
    }

    return ImplementationMarker(
      name = "Jump to $implementationName",
      element = element,
      target = implementationMethod
    )
  }
}