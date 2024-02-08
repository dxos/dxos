package org.dxos.test

import com.intellij.execution.Executor
import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.execution.configurations.RunProfileState
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.openapi.project.Project
import com.jetbrains.nodejs.mocha.MochaUtil
import com.jetbrains.nodejs.mocha.execution.MochaRunConfiguration

class DxosMochaRunConfiguration(
    project: Project, factory: ConfigurationFactory, name: String?
) : MochaRunConfiguration(project, factory, name) {
    override fun getState(executor: Executor, environment: ExecutionEnvironment): RunProfileState {
        return DxosMochaRunProfileState(
            this.project,
            this,
            environment,
            runSettings.mochaPackage ?: MochaUtil.getMochaPackage(project),
            runSettings
        )
    }
}