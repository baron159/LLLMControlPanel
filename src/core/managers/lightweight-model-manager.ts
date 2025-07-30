// Lightweight Model Manager - communicates with ONNX worker
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

export class LightweightModelManager {
  private models: Map<string, ModelConfig> = new Map()
  private modelStatus: Map<string, ModelStatus> = new Map()
  private worker: Worker | null = null
  private messageId = 0

  constructor() {
    this.initializeDefaultModels()
  }

  private initializeDefaultModels(): void {
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

  private async getWorker(): Promise<Worker> {
    if (!this.worker) {
      // Use chrome.runtime.getURL for extension context
      const workerUrl = chrome.runtime.getURL('onnx-worker.js')
      this.worker = new Worker(workerUrl, { type: 'module' })
    }
    return this.worker
  }

  private async sendWorkerMessage(type: string, data: any = {}): Promise<any> {
    const worker = await this.getWorker()
    const id = ++this.messageId
    
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.data.id === id) {
          worker.removeEventListener('message', handler)
          if (event.data.success) {
            resolve(event.data.result)
          } else {
            reject(new Error(event.data.error))
          }
        }
      }
      
      worker.addEventListener('message', handler)
      worker.postMessage({ type, data, id })
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
      status.loadingProgress = 25
      
      const success = await this.sendWorkerMessage('loadModel', {
        modelId,
        config: model.providerConfig
      })
      
      if (success) {
        status.isLoaded = true
        status.provider = await this.sendWorkerMessage('getCurrentProvider')
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
    const targetModelId = modelId || await this.sendWorkerMessage('getCurrentModel')
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

    return await this.sendWorkerMessage('generateResponse', {
      message,
      options: {
        maxTokens: model.maxTokens,
        temperature: model.temperature,
        topP: model.topP
      }
    })
  }

  async runInference(input: any, modelId?: string, options?: any): Promise<any> {
    const targetModelId = modelId || await this.sendWorkerMessage('getCurrentModel')
    if (!targetModelId) {
      throw new Error('No model loaded')
    }

    if (!this.modelStatus.get(targetModelId)?.isLoaded && !await this.loadModel(targetModelId)) {
      throw new Error(`Failed to load model ${targetModelId}`)
    }

    return await this.sendWorkerMessage('runInference', { input, options })
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
    return await this.sendWorkerMessage('getCurrentModel')
  }

  async getCurrentProvider(): Promise<string | null> {
    return await this.sendWorkerMessage('getCurrentProvider')
  }

  async getAvailableProviders(): Promise<string[]> {
    return await this.sendWorkerMessage('getAvailableProviders')
  }

  async getWebNNDevices(): Promise<any[]> {
    return await this.sendWorkerMessage('getWebNNDevices')
  }

  async getPreferredWebNNDevice(): Promise<any> {
    return await this.sendWorkerMessage('getPreferredWebNNDevice')
  }

  async getCacheStats(): Promise<any> {
    return await this.sendWorkerMessage('getCacheStats')
  }

  async getCachedModels(): Promise<any[]> {
    return await this.sendWorkerMessage('getCachedModels')
  }

  async isModelCached(modelId: string): Promise<boolean> {
    return await this.sendWorkerMessage('isModelCached', { modelId })
  }

  async removeCachedModel(modelId: string): Promise<boolean> {
    return await this.sendWorkerMessage('removeCachedModel', { modelId })
  }

  async clearAllCachedModels(): Promise<boolean> {
    return await this.sendWorkerMessage('clearAllCachedModels')
  }

  async cleanupOldCachedModels(maxAge?: number): Promise<number> {
    return await this.sendWorkerMessage('cleanupOldCachedModels', { maxAge })
  }

  async getCacheUsagePercentage(): Promise<number> {
    return await this.sendWorkerMessage('getCacheUsagePercentage')
  }

  async unloadModel(modelId: string): Promise<void> {
    await this.sendWorkerMessage('unloadModel', { modelId })
    const status = this.modelStatus.get(modelId)
    if (status) {
      status.isLoaded = false
      status.provider = null
      status.loadingProgress = 0
    }
  }

  async unloadAllModels(): Promise<void> {
    await this.sendWorkerMessage('unloadAllModels')
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