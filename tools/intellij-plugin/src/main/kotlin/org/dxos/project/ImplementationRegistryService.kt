package org.dxos.project

import com.intellij.lang.javascript.TypeScriptFileType
import com.intellij.lang.javascript.psi.JSCallExpression
import com.intellij.lang.javascript.psi.JSObjectLiteralExpression
import com.intellij.lang.javascript.psi.JSReferenceExpression
import com.intellij.lang.javascript.psi.ecma6.TypeScriptNewExpression
import com.intellij.lang.javascript.psi.ecmal4.JSClass
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.psi.search.FilenameIndex
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.psi.util.PsiUtilCore
import org.dxos.psi.PsiTypeResolver

@Service(Service.Level.PROJECT)
class ImplementationRegistryService(private val project: Project) {

  private val serviceRegistrationFile by lazy {
    FilenameIndex.getVirtualFilesByName(
      SERVICE_REGISTRATION_FILE,
      GlobalSearchScope.getScopeRestrictedByFileTypes(
        GlobalSearchScope.projectScope(project),
        TypeScriptFileType.INSTANCE
      ))
      .toList()[0]
  }

  fun getByName(serviceName: String?): JSClass? {
    val psiFile = PsiUtilCore.getPsiFile(project, serviceRegistrationFile)
    val serviceRegistration = PsiTreeUtil.findChildrenOfType(psiFile, JSCallExpression::class.java).find {
      (it.methodExpression as? JSReferenceExpression)?.referenceName == "setServices"
    }
    val params = PsiTreeUtil.findChildOfType(serviceRegistration, JSObjectLiteralExpression::class.java)
    return (params?.properties ?: emptyArray()).firstNotNullOfOrNull { property ->
      val value = property.value
      when {
        property.name != serviceName -> null
        value is JSReferenceExpression -> PsiTypeResolver.resolveFromReference(value)
        value is TypeScriptNewExpression -> PsiTypeResolver.resolveFromConstructor(value)
        else -> null
      }
    }
  }

  companion object {
    private const val SERVICE_REGISTRATION_FILE = "service-host.ts"
  }
}