// Lightweight Model Manager - communicates with ONNX worker
import { BaseModelManager } from './base-model-manager'
import type { ModelConfig, ModelStatus } from './base-model-manager'

export type { ModelConfig, ModelStatus }

export class LightweightModelManager extends BaseModelManager {
  private worker: Worker | null = null
  private messageId = 0

  constructor() {
    super()
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

  // Implement abstract methods from BaseModelManager
  protected async loadModelInternal(modelId: string, config?: any): Promise<boolean> {
    return await this.sendWorkerMessage('loadModel', {
      modelId,
      config
    })
  }

  protected async generateResponseInternal(message: string, options?: any): Promise<string> {
    return await this.sendWorkerMessage('generateResponse', {
      message,
      options
    })
  }

  protected async runInferenceInternal(input: any, options?: any): Promise<any> {
    return await this.sendWorkerMessage('runInference', { input, options })
  }

  protected async getCurrentModelInternal(): Promise<string | null> {
    return await this.sendWorkerMessage('getCurrentModel')
  }

  protected async getCurrentProviderInternal(): Promise<string | null> {
    return await this.sendWorkerMessage('getCurrentProvider')
  }

  protected async getAvailableProvidersInternal(): Promise<string[]> {
    return await this.sendWorkerMessage('getAvailableProviders')
  }

  protected async getWebNNDevicesInternal(): Promise<any[]> {
    return await this.sendWorkerMessage('getWebNNDevices')
  }

  protected async getPreferredWebNNDeviceInternal(): Promise<any> {
    return await this.sendWorkerMessage('getPreferredWebNNDevice')
  }

  protected async getCacheStatsInternal(): Promise<any> {
    return await this.sendWorkerMessage('getCacheStats')
  }

  protected async getCachedModelsInternal(): Promise<any[]> {
    return await this.sendWorkerMessage('getCachedModels')
  }

  protected async isModelCachedInternal(modelId: string): Promise<boolean> {
    return await this.sendWorkerMessage('isModelCached', { modelId })
  }

  protected async removeCachedModelInternal(modelId: string): Promise<boolean> {
    return await this.sendWorkerMessage('removeCachedModel', { modelId })
  }

  protected async clearAllCachedModelsInternal(): Promise<boolean> {
    return await this.sendWorkerMessage('clearAllCachedModels')
  }

  protected async cleanupOldCachedModelsInternal(maxAge?: number): Promise<number> {
    return await this.sendWorkerMessage('cleanupOldCachedModels', { maxAge })
  }

  protected async getCacheUsagePercentageInternal(): Promise<number> {
    return await this.sendWorkerMessage('getCacheUsagePercentage')
  }

  protected async unloadModelInternal(modelId: string): Promise<void> {
    await this.sendWorkerMessage('unloadModel', { modelId })
  }

  protected async unloadAllModelsInternal(): Promise<void> {
    await this.sendWorkerMessage('unloadAllModels')
  }
} 