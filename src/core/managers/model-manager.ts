import { ONNXProvider, ONNXProviderConfig } from '../providers/onnx-provider'
import { BaseModelManager } from './base-model-manager'
import type { ModelConfig, ModelStatus } from './base-model-manager'

export type { ModelConfig, ModelStatus }

export class ModelManager extends BaseModelManager {
  private onnxProvider: ONNXProvider

  constructor() {
    super()
    this.onnxProvider = new ONNXProvider()
  }

  // Implement abstract methods from BaseModelManager
  protected async loadModelInternal(modelId: string, config?: ONNXProviderConfig): Promise<boolean> {
    return await this.onnxProvider.loadModel(modelId, config)
  }

  protected async generateResponseInternal(message: string, options?: any): Promise<string> {
    return await this.onnxProvider.generateResponse(message, options)
  }

  protected async runInferenceInternal(input: any, options?: any): Promise<any> {
    return await this.onnxProvider.runInference(input, options)
  }

  protected async getCurrentModelInternal(): Promise<string | null> {
    return this.onnxProvider.getCurrentModel()
  }

  protected async getCurrentProviderInternal(): Promise<string | null> {
    return this.onnxProvider.getCurrentProvider()
  }

  protected async getAvailableProvidersInternal(): Promise<string[]> {
    return this.onnxProvider.getAvailableProviders()
  }

  protected async getWebNNDevicesInternal(): Promise<any[]> {
    return this.onnxProvider.getWebNNDevices()
  }

  protected async getPreferredWebNNDeviceInternal(): Promise<any> {
    return this.onnxProvider.getPreferredWebNNDevice()
  }

  protected async getCacheStatsInternal(): Promise<any> {
    return await this.onnxProvider.getCacheStats()
  }

  protected async getCachedModelsInternal(): Promise<any[]> {
    return await this.onnxProvider.getCachedModels()
  }

  protected async isModelCachedInternal(modelId: string): Promise<boolean> {
    return await this.onnxProvider.isModelCached(modelId)
  }

  protected async removeCachedModelInternal(modelId: string): Promise<boolean> {
    return await this.onnxProvider.removeCachedModel(modelId)
  }

  protected async clearAllCachedModelsInternal(): Promise<boolean> {
    return await this.onnxProvider.clearAllCachedModels()
  }

  protected async cleanupOldCachedModelsInternal(maxAge?: number): Promise<number> {
    return await this.onnxProvider.cleanupOldCachedModels(maxAge)
  }

  protected async getCacheUsagePercentageInternal(): Promise<number> {
    return await this.onnxProvider.getCacheUsagePercentage()
  }

  protected async unloadModelInternal(modelId: string): Promise<void> {
    await this.onnxProvider.unloadModel(modelId)
  }

  protected async unloadAllModelsInternal(): Promise<void> {
    await this.onnxProvider.unloadAllModels()
  }
} 