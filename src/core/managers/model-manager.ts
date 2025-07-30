import { ONNXProvider, ONNXProviderConfig } from '../providers/onnx-provider'

export interface ModelConfig {
  id: string
  name: string
  description: string
  modelPath?: string
  modelData?: ArrayBuffer
  providerConfig?: ONNXProviderConfig
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

export class ModelManager {
  private onnxProvider: ONNXProvider
  private models: Map<string, ModelConfig> = new Map()
  private modelStatus: Map<string, ModelStatus> = new Map()

  constructor() {
    this.onnxProvider = new ONNXProvider()
    this.initializeDefaultModels()
  }

  private initializeDefaultModels(): void {
    // Add some default models for demo purposes
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

  async loadModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const status = this.modelStatus.get(modelId)!
    status.loadingProgress = 0
    status.error = undefined

    try {
      // Update progress
      status.loadingProgress = 25
      
      // Load model with ONNX provider
      const success = await this.onnxProvider.loadModel(modelId, model.providerConfig)
      
      if (success) {
        status.isLoaded = true
        status.provider = this.onnxProvider.getCurrentProvider()
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
    const targetModelId = modelId || this.onnxProvider.getCurrentModel()
    if (!targetModelId) {
      throw new Error('No model loaded')
    }

    const model = this.models.get(targetModelId)
    if (!model) {
      throw new Error(`Model ${targetModelId} not found`)
    }

    const status = this.modelStatus.get(targetModelId)
    if (!status?.isLoaded) {
      // Try to load the model if not loaded
      const loaded = await this.loadModel(targetModelId)
      if (!loaded) {
        throw new Error(`Failed to load model ${targetModelId}`)
      }
    }

    return await this.onnxProvider.generateResponse(message, {
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      topP: model.topP
    })
  }

  async runInference(
    input: any,
    modelId?: string,
    options?: any
  ): Promise<any> {
    const targetModelId = modelId || this.onnxProvider.getCurrentModel()
    if (!targetModelId) {
      throw new Error('No model loaded')
    }

    const status = this.modelStatus.get(targetModelId)
    if (!status?.isLoaded) {
      const loaded = await this.loadModel(targetModelId)
      if (!loaded) {
        throw new Error(`Failed to load model ${targetModelId}`)
      }
    }

    return await this.onnxProvider.runInference(input, options)
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

  getCurrentModel(): string | null {
    return this.onnxProvider.getCurrentModel()
  }

  getCurrentProvider(): string | null {
    return this.onnxProvider.getCurrentProvider()
  }

  getAvailableProviders(): string[] {
    return this.onnxProvider.getAvailableProviders()
  }

  // WebNN methods
  getWebNNDevices(): any[] {
    return this.onnxProvider.getWebNNDevices()
  }

  getPreferredWebNNDevice(): any {
    return this.onnxProvider.getPreferredWebNNDevice()
  }

  // Cache management methods
  async getCacheStats(): Promise<any> {
    return await this.onnxProvider.getCacheStats()
  }

  async getCachedModels(): Promise<any[]> {
    return await this.onnxProvider.getCachedModels()
  }

  async isModelCached(modelId: string): Promise<boolean> {
    return await this.onnxProvider.isModelCached(modelId)
  }

  async removeCachedModel(modelId: string): Promise<boolean> {
    return await this.onnxProvider.removeCachedModel(modelId)
  }

  async clearAllCachedModels(): Promise<boolean> {
    return await this.onnxProvider.clearAllCachedModels()
  }

  async cleanupOldCachedModels(maxAge?: number): Promise<number> {
    return await this.onnxProvider.cleanupOldCachedModels(maxAge)
  }

  async getCacheUsagePercentage(): Promise<number> {
    return await this.onnxProvider.getCacheUsagePercentage()
  }

  async unloadModel(modelId: string): Promise<void> {
    await this.onnxProvider.unloadModel(modelId)
    
    const status = this.modelStatus.get(modelId)
    if (status) {
      status.isLoaded = false
      status.provider = null
      status.loadingProgress = 0
    }
  }

  async unloadAllModels(): Promise<void> {
    await this.onnxProvider.unloadAllModels()
    
    // Reset all status
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