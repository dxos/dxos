import {defineConfig, mergeConfig} from 'vitest/config'
import rootConfig from '../../../vite.config'

export default mergeConfig(
  rootConfig,
  defineConfig({})
)