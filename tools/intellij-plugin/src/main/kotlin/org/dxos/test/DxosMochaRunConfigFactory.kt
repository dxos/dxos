package org.dxos.test

import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.ConfigurationTypeUtil
import com.intellij.execution.configurations.RunConfiguration
import com.intellij.execution.configurations.RunConfigurationSingletonPolicy
import com.intellij.execution.configurations.SimpleConfigurationType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.NotNullLazyValue
import com.jetbrains.nodejs.mocha.execution.MochaRunSettings
import org.dxos.util.Icons

class DxosMochaRunConfigFactory : SimpleConfigurationType(
    "DxosMochaTestRunner",
    "DxosMochaRunConfigFactory",
    null,
    NotNullLazyValue.lazy { Icons.DxosLogo }
) {
    override fun isEditableInDumbMode() = true

    override fun getSingletonPolicy() = RunConfigurationSingletonPolicy.SINGLE_INSTANCE_ONLY

    override fun createTemplateConfiguration(project: Project): RunConfiguration {
        return DxosMochaRunConfiguration(project, this, null).apply {
            val defaultEnvironment = mapOf(
                "LOG_FILTER" to "debug",
                "LOG_CONFIG" to "log-config.yaml"
            )
            runSettings = MochaRunSettings.Builder(runSettings)
                .setEnvData(EnvironmentVariablesData.create(defaultEnvironment, true))
                .build()
        }
    }

    companion object {
        fun getInstance(): DxosMochaRunConfigFactory {
            return ConfigurationTypeUtil.findConfigurationType(DxosMochaRunConfigFactory::class.java);
        }
    }
}