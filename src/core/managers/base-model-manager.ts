// Base Model Manager - shared functionality between ModelManager and LightweightModelManager
export interface ModelConfig {
  id: string
  name: string
  description: string
  modelPath?: string
  modelData?: ArrayBuffer
  providerConfig?: any
  maxTokens?: number
  temperature?: number
  topP?: number
}

export interface ModelStatus {
  modelId: string
  isLoaded: boolean
  provider: string | null
  loadingProgress: number
  error?: string
}

export abstract class BaseModelManager {
  protected models: Map<string, ModelConfig> = new Map()
  protected modelStatus: Map<string, ModelStatus> = new Map()

  constructor() {
    this.initializeDefaultModels()
  }

  protected initializeDefaultModels(): void {
    const defaultModels: ModelConfig[] = [
      {
        id: 'tinyllama-1.1b-chat',
        name: 'TinyLlama 1.1B Chat',
        description: 'A small, fast language model for chat applications',
        providerConfig: {
          executionProviders: ['webnn', 'webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
          enableMemPattern: true
        },
        maxTokens: 512,
        temperature: 0.7,
        topP: 0.9
      },
      {
        id: 'llama-2-7b-chat',
        name: 'Llama 2 7B Chat',
        description: 'Medium-sized language model with good performance',
        providerConfig: {
          executionProviders: ['webnn', 'webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
          enableMemPattern: true
        },
        maxTokens: 1024,
        temperature: 0.8,
        topP: 0.9
      },
      {
        id: 'gpt-2-small',
        name: 'GPT-2 Small',
        description: 'Small GPT-2 model for text generation',
        providerConfig: {
          executionProviders: ['webnn', 'webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
          enableMemPattern: true
        },
        maxTokens: 256,
        temperature: 0.9,
        topP: 0.9
      }
    ]

    defaultModels.forEach(model => {
      this.models.set(model.id, model)
      this.modelStatus.set(model.id, {
        modelId: model.id,
        isLoaded: false,
        provider: null,
        loadingProgress: 0
      })
    })
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract loadModelInternal(modelId: string, config?: any): Promise<boolean>
  protected abstract generateResponseInternal(message: string, options?: any): Promise<string>
  protected abstract runInferenceInternal(input: any, options?: any): Promise<any>
  protected abstract getCurrentModelInternal(): Promise<string | null>
  protected abstract getCurrentProviderInternal(): Promise<string | null>
  protected abstract getAvailableProvidersInternal(): Promise<string[]>
  protected abstract getWebNNDevicesInternal(): Promise<any[]>
  protected abstract getPreferredWebNNDeviceInternal(): Promise<any>
  protected abstract getCacheStatsInternal(): Promise<any>
  protected abstract getCachedModelsInternal(): Promise<any[]>
  protected abstract isModelCachedInternal(modelId: string): Promise<boolean>
  protected abstract removeCachedModelInternal(modelId: string): Promise<boolean>
  protected abstract clearAllCachedModelsInternal(): Promise<boolean>
  protected abstract cleanupOldCachedModelsInternal(maxAge?: number): Promise<number>
  protected abstract getCacheUsagePercentageInternal(): Promise<number>
  protected abstract unloadModelInternal(modelId: string): Promise<void>
  protected abstract unloadAllModelsInternal(): Promise<void>

  // Shared public methods
  async loadModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const status = this.modelStatus.get(modelId)!
    status.loadingProgress = 0
    status.error = undefined

    try {
      status.loadingProgress = 25
      
      const success = await this.loadModelInternal(modelId, model.providerConfig)
      
      if (success) {
        status.isLoaded = true
        status.provider = await this.getCurrentProviderInternal()
        status.loadingProgress = 100
        console.log(`Model ${modelId} loaded successfully with provider: ${status.provider}`)
        return true
      } else {
        status.error = 'Failed to load model'
        status.loadingProgress = 0
        return false
      }
    } catch (error: any) {
      status.error = error.message
      status.loadingProgress = 0
      console.error(`Failed to load model ${modelId}:`, error)
      return false
    }
  }

  async generateResponse(message: string, modelId?: string): Promise<string> {
    const targetModelId = modelId || await this.getCurrentModelInternal()
    if (!targetModelId) {
      throw new Error('No model loaded')
    }

    const model = this.models.get(targetModelId)
    if (!model) {
      throw new Error(`Model ${targetModelId} not found`)
    }

    if (!this.modelStatus.get(targetModelId)?.isLoaded && !await this.loadModel(targetModelId)) {
      throw new Error(`Failed to load model ${targetModelId}`)
    }

    return await this.generateResponseInternal(message, {
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      topP: model.topP
    })
  }

  async runInference(input: any, modelId?: string, options?: any): Promise<any> {
    const targetModelId = modelId || await this.getCurrentModelInternal()
    if (!targetModelId) {
      throw new Error('No model loaded')
    }

    if (!this.modelStatus.get(targetModelId)?.isLoaded && !await this.loadModel(targetModelId)) {
      throw new Error(`Failed to load model ${targetModelId}`)
    }

    return await this.runInferenceInternal(input, options)
  }

  getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values())
  }

  getModelStatus(modelId: string): ModelStatus | null {
    return this.modelStatus.get(modelId) || null
  }

  getAllModelStatus(): ModelStatus[] {
    return Array.from(this.modelStatus.values())
  }

  async getCurrentModel(): Promise<string | null> {
    return await this.getCurrentModelInternal()
  }

  async getCurrentProvider(): Promise<string | null> {
    return await this.getCurrentProviderInternal()
  }

  async getAvailableProviders(): Promise<string[]> {
    return await this.getAvailableProvidersInternal()
  }

  async getWebNNDevices(): Promise<any[]> {
    return await this.getWebNNDevicesInternal()
  }

  async getPreferredWebNNDevice(): Promise<any> {
    return await this.getPreferredWebNNDeviceInternal()
  }

  async getCacheStats(): Promise<any> {
    return await this.getCacheStatsInternal()
  }

  async getCachedModels(): Promise<any[]> {
    return await this.getCachedModelsInternal()
  }

  async isModelCached(modelId: string): Promise<boolean> {
    return await this.isModelCachedInternal(modelId)
  }

  async removeCachedModel(modelId: string): Promise<boolean> {
    return await this.removeCachedModelInternal(modelId)
  }

  async clearAllCachedModels(): Promise<boolean> {
    return await this.clearAllCachedModelsInternal()
  }

  async cleanupOldCachedModels(maxAge?: number): Promise<number> {
    return await this.cleanupOldCachedModelsInternal(maxAge)
  }

  async getCacheUsagePercentage(): Promise<number> {
    return await this.getCacheUsagePercentageInternal()
  }

  async unloadModel(modelId: string): Promise<void> {
    await this.unloadModelInternal(modelId)
    const status = this.modelStatus.get(modelId)
    if (status) {
      status.isLoaded = false
      status.provider = null
      status.loadingProgress = 0
    }
  }

  async unloadAllModels(): Promise<void> {
    await this.unloadAllModelsInternal()
    for (const status of this.modelStatus.values()) {
      status.isLoaded = false
      status.provider = null
      status.loadingProgress = 0
    }
  }

  addModel(model: ModelConfig): void {
    this.models.set(model.id, model)
    this.modelStatus.set(model.id, {
      modelId: model.id,
      isLoaded: false,
      provider: null,
      loadingProgress: 0
    })
  }

  removeModel(modelId: string): void {
    this.models.delete(modelId)
    this.modelStatus.delete(modelId)
    this.unloadModel(modelId)
  }
} 