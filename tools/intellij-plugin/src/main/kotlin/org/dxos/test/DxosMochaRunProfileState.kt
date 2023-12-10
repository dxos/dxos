package org.dxos.test

import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.javascript.debugger.CommandLineDebugConfigurator
import com.intellij.javascript.nodejs.execution.NodeTargetRun
import com.intellij.javascript.nodejs.execution.NodeTargetRunOptions
import com.intellij.javascript.nodejs.util.NodePackage
import com.intellij.javascript.testing.JSTestRunnerUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.guessProjectDir
import com.jetbrains.nodejs.mocha.execution.MochaRunConfiguration
import com.jetbrains.nodejs.mocha.execution.MochaRunProfileState
import com.jetbrains.nodejs.mocha.execution.MochaRunSettings
import com.jetbrains.nodejs.mocha.execution.MochaTestKind
import com.jetbrains.nodejs.util.NodeJsCodeLocator
import java.io.File

class DxosMochaRunProfileState(
    private val project: Project,
    private val runConfiguration: MochaRunConfiguration,
    env: ExecutionEnvironment,
    mochaPackage: NodePackage,
    runSettings: MochaRunSettings
) : MochaRunProfileState(
    project, runConfiguration, env, mochaPackage, runSettings
) {
    override fun startProcess(configurator: CommandLineDebugConfigurator?): ProcessHandler {
        val interpreter = runSettings.interpreterRef.resolveNotNull(project)
        val targetRun = NodeTargetRun(
            interpreter,
            project,
            configurator,
            NodeTargetRunOptions.of(false, runConfiguration)
        )
        targetRun.envData = runSettings.envData
        targetRun.commandLineBuilder.apply {
            setExePath("pnpm")
            setWorkingDirectory(guessProjectDir())
            buildNxCommands().forEach { addParameter(it) }
        }
        return targetRun.startProcess()
    }

    private fun buildNxCommands(): List<String> {
        val cmd = mutableListOf("nx")
        val project = findProject()
        cmd += if (project == null) {
            listOf("run-many", "-t", "test")
        } else {
            listOf("test", project)
        }

        val reporterFile = NodeJsCodeLocator.getFileRelativeToJsDir("mocha-intellij/lib/mochaIntellijReporter.js")
        cmd += listOf("--reporter", reporterFile.absolutePath)

        getTestPattern()?.let { testPattern ->
            cmd += listOf("--testPatterns", testPattern)
        }

        getGrepPattern()?.let { grepPattern ->
            cmd += listOf("--grep", grepPattern)
        }

        return cmd
    }

    private fun findProject(): String? {
        var fileIterator = File(runSettings.testFilePath)
        while (fileIterator.absolutePath != "/") {
            if (fileIterator.isDirectory) {
                val isNxProjectRoot = fileIterator.listFiles()?.any { it.name == "project.json" } ?: false
                if (isNxProjectRoot) {
                    return fileIterator.name
                }
            }
            fileIterator = fileIterator.parentFile
        }
        return null
    }

    private fun getTestPattern() = when {
        runSettings.testFilePattern.isNotBlank() -> runSettings.testFilePattern
        runSettings.testFilePath.isNotBlank() -> {
            runSettings.testFilePath.substring(guessProjectDir().length + 1)
        }
        else -> null
    }

    private fun getGrepPattern() = when (runConfiguration.runSettings.testKind) {
        MochaTestKind.SUITE -> JSTestRunnerUtil.buildTestNamesPattern(
            project,
            runSettings.testFilePath,
            runSettings.suiteNames,
            true
        )
        MochaTestKind.TEST -> JSTestRunnerUtil.buildTestNamesPattern(
            project,
            runSettings.testFilePath,
            runSettings.testNames,
            false
        )
        else -> null
    }

    private fun guessProjectDir(): String = project.guessProjectDir()?.path ?: "/"

}