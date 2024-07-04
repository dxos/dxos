package org.dxos.navigation

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.icons.AllIcons
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.psi.PsiElement
import com.intellij.util.PsiNavigateUtil


class ImplementationMarker(
  name: String,
  element: PsiElement,
  target: PsiElement
) : LineMarkerInfo<PsiElement>(
  element,
  element.textRange,
  AllIcons.Gutter.ImplementingMethod,
  { name },
  { _, _ -> PsiNavigateUtil.navigate(target) },
  GutterIconRenderer.Alignment.CENTER,
  { name },
)