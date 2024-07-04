package org.dxos.navigation

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.codeInsight.daemon.LineMarkerProviderDescriptor
import com.intellij.psi.PsiElement


class ResourceImplMarkerProvider : LineMarkerProviderDescriptor() {

  private val implementationLocator = RealImplementationLocator(
    wrapperMethodHostClass = "Resource",
    wrapperMethods = arrayOf("open", "close"),
    methodNameTransform = { methodName -> "_${methodName}" }
  )

  override fun getName() = "Resource method"

  override fun getLineMarkerInfo(element: PsiElement): LineMarkerInfo<*>? {
    return implementationLocator.createNavigationMarker(element)
  }

}