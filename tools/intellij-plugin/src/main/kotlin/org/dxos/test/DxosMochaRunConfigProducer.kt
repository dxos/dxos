package org.dxos.test

import com.intellij.execution.actions.ConfigurationFromContext
import com.jetbrains.nodejs.mocha.execution.MochaRunConfigurationProducer

class DxosMochaRunConfigProducer : MochaRunConfigurationProducer() {
  override fun getConfigurationFactory() = DxosMochaRunConfigFactory.getInstance()

  override fun isPreferredConfiguration(self: ConfigurationFromContext?, other: ConfigurationFromContext?) = true
}