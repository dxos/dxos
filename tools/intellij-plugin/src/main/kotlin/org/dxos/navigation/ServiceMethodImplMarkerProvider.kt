package org.dxos.navigation

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.codeInsight.daemon.LineMarkerProviderDescriptor
import com.intellij.lang.javascript.psi.JSCallExpression
import com.intellij.lang.javascript.psi.JSReferenceExpression
import com.intellij.psi.PsiElement
import com.intellij.psi.util.PsiTreeUtil
import org.dxos.project.ImplementationRegistryService

class ServiceMethodImplMarkerProvider : LineMarkerProviderDescriptor() {

  override fun getName() = "Service method"

  override fun getLineMarkerInfo(element: PsiElement): LineMarkerInfo<*>? {
    val file = element.containingFile.virtualFile
    if (file == null || file.fileType.isBinary) {
      return null
    }
    if (element !is JSCallExpression) {
      return null
    }
    val methodRef = element.methodExpression as? JSReferenceExpression ?: return null
    val receiverRef = PsiTreeUtil.findChildOfType(methodRef, JSReferenceExpression::class.java)
    if (receiverRef?.referenceKind != JSReferenceExpression.Kind.PropertyAccess) {
      return null
    }
    if (receiverRef.text?.matches(".*\\.services\\.\\w+$".toRegex()) != true) {
      return null
    }
    val implementationRegistry = element.project.getService(ImplementationRegistryService::class.java)
    val serviceImplementation = implementationRegistry.getByName(receiverRef.referenceName)
    val methodImplementation = serviceImplementation?.functions?.find { it.name == methodRef.referenceName }
    if (methodImplementation == null) {
      return null
    }

    return ImplementationMarker(
      name = "Jump to ${serviceImplementation.name}",
      element = element,
      target = methodImplementation
    )
  }

}