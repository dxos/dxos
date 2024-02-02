package org.dxos.util

import com.intellij.ui.IconManager

object Icons {
    val DxosLogo = load("/icons/dxos_logo.svg")
    private fun load(path: String) = IconManager.getInstance().getIcon(path, Icons::class.java.classLoader)
}