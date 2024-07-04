package org.dxos.navigation

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.icons.AllIcons
import com.intellij.lang.javascript.psi.JSCallExpression
import com.intellij.lang.javascript.psi.JSFunction
import com.intellij.lang.javascript.psi.JSReferenceExpression
import com.intellij.lang.javascript.psi.ecma6.TypeScriptSingleType
import com.intellij.lang.javascript.psi.ecmal4.JSClass
import com.intellij.lang.javascript.psi.resolve.JSResolveUtil
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.psi.PsiElement
import com.intellij.util.PsiNavigateUtil

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
    val resolvedReceiver = receiver.resolve()
    val receiverType = JSResolveUtil.getElementJSType(resolvedReceiver);
    val receiverDeclaration = receiverType?.source?.sourceElement as? TypeScriptSingleType
    val resolvedClass = (receiverDeclaration?.firstChild as? JSReferenceExpression)?.resolve()
    val typeScriptClass = resolvedClass as? JSClass ?: return null
    val implementationName = methodNameTransform(methodRef.referenceName)
    val implementationFunction = typeScriptClass.functions.find { it.name == implementationName }
    if (implementationFunction == null) {
      return null
    }

    val name = "Jump to $implementationName"
    return LineMarkerInfo(
      element,
      element.getTextRange(),
      AllIcons.Gutter.ImplementingMethod,
      { name },
      { _, _ -> PsiNavigateUtil.navigate(implementationFunction) },
      GutterIconRenderer.Alignment.CENTER,
      { name },
    )
  }
}