// ONNX Worker - handles heavy ONNX operations
import type * as ort from 'onnxruntime-web'
// import { WebNNUtils } from '../utils/webnn-utils'
// import { ModelCache } from '../utils/model-cache'
import { BaseONNXHandler } from '../core/providers/onnx-provider'
import type { ModelConfig } from '@/core/managers/model-manager';

export interface ONNXWorkerConfig {
  executionProviders: string[]
  modelPath?: string
  modelData?: ArrayBuffer
  optimizationLevel?: 'all' | 'basic' | 'disabled'
  graphOptimizationLevel?: 'all' | 'basic' | 'disabled'
  enableCpuMemArena?: boolean
  enableMemPattern?: boolean
  executionMode?: 'sequential' | 'parallel'
  extra?: Record<string, any>
}

class ONNXWorker extends BaseONNXHandler {

  async addApprovedModel(modelId: string, modelConfig?: Partial<ModelConfig>): Promise<boolean> {
    if(!this.modelList){
      throw new Error('Model list not initialized');
    }
    this.modelList.addModel(modelId, modelConfig);
    return true;
  }


  async generateResponse(message: string, options?: {
    maxTokens?: number
    temperature?: number
    topP?: number
  }): Promise<string> {
    if (!this.currentModelId) {
      throw new Error('No model loaded')
    }

    const session = this.sessions.get(this.currentModelId)
    if (!session || !session.isLoaded) {
      throw new Error('Model not loaded')
    }

    try {
      console.log(`Running inference with provider: ${session.provider}`)
      console.log(`Input message: ${message}`)
      if (options) {
        console.log(`Options: maxTokens=${options.maxTokens}, temperature=${options.temperature}, topP=${options.topP}`)
      }
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const responses = {
        webnn: 'This response was generated using WebNN acceleration for optimal performance.',
        webgpu: 'This response was generated using WebGPU acceleration for high-performance inference.',
        wasm: 'This response was generated using WebAssembly for cross-platform compatibility.'
      }
      
      return `${responses[session.provider as keyof typeof responses] || 'This response was generated using ONNX Runtime.'} (Model: ${this.currentModelId}, Provider: ${session.provider})`
    } catch (error) {
      console.error('Inference failed:', error)
      throw new Error(`Inference failed: ${error}`)
    }
  }

  async runInference(
    input: ort.InferenceSession.FeedsType,
    options?: ort.InferenceSession.RunOptions
  ): Promise<ort.InferenceSession.OnnxValueMapType> {
    if (!this.currentModelId) {
      throw new Error('No model loaded')
    }

    const session = this.sessions.get(this.currentModelId)
    if (!session || !session.isLoaded) {
      throw new Error('Model not loaded')
    }

    return await session.session.run(input, options)
  }

  async unloadModel(modelId: string): Promise<void> {
    const session = this.sessions.get(modelId)
    if (session) {
      try {
        console.log(`Unloading model: ${modelId}`)
        session.session.release()
      } catch (error) {
        console.warn('Error unloading session:', error)
      }
      this.sessions.delete(modelId)
      if (this.currentModelId === modelId) {
        this.currentModelId = null
      }
    }
  }

  async unloadAllModels(): Promise<void> {
    for (const [modelId] of this.sessions) {
      await this.unloadModel(modelId)
    }
  }
}

// Create singleton instance
const onnxWorker = new ONNXWorker()

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data, id } = event.data
  
  try {
    let result: any
    
    switch (type) {
      case 'loadModel':
        result = await onnxWorker.loadModel(data.modelId, data.config)
        break
      case 'generateResponse':
        result = await onnxWorker.generateResponse(data.message, data.options)
        break
      case 'runInference':
        result = await onnxWorker.runInference(data.input, data.options)
        break
      case 'getCurrentModel':
        result = onnxWorker.getCurrentModel()
        break
      case 'getCurrentProvider':
        result = onnxWorker.getCurrentProvider()
        break
      case 'isModelLoaded':
        result = onnxWorker.isModelLoaded(data.modelId)
        break
      case 'getAvailableProviders':
        result = onnxWorker.getAvailableProviders()
        break
      case 'getWebNNDevices':
        result = onnxWorker.getWebNNDevices()
        break
      case 'getPreferredWebNNDevice':
        result = onnxWorker.getPreferredWebNNDevice()
        break
      case 'getCacheStats':
        result = await onnxWorker.getCacheStats()
        break
      case 'getCachedModels':
        result = await onnxWorker.getCachedModels()
        break
      case 'isModelCached':
        result = await onnxWorker.isModelCached(data.modelId)
        break
      case 'removeCachedModel':
        result = await onnxWorker.removeCachedModel(data.modelId)
        break
      case 'clearAllCachedModels':
        result = await onnxWorker.clearAllCachedModels()
        break
      case 'cleanupOldCachedModels':
        result = await onnxWorker.cleanupOldCachedModels(data.maxAge)
        break
      case 'getCacheUsagePercentage':
        result = await onnxWorker.getCacheUsagePercentage()
        break
      case 'getSessionInfo':
        result = onnxWorker.getSessionInfo(data.modelId)
        break
      case 'unloadModel':
        await onnxWorker.unloadModel(data.modelId)
        result = true
        break
      case 'unloadAllModels':
        await onnxWorker.unloadAllModels()
        result = true
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    self.postMessage({ id, success: true, result })
  } catch (error) {
    self.postMessage({ id, success: false, error: error instanceof Error ? error.message : String(error) })
  }
}

console.log('ONNX Worker loaded') 