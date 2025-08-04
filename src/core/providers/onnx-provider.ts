import type { InferenceSession } from 'onnxruntime-web/all';
import type{ ModelDataList, ModelConfig } from '@/utils/model.list.ts';

import { WebNNUtils } from '../../utils/webnn-utils'
import { ModelCache } from '../../utils/model-cache'

export interface ONNXProviderConfig {
  executionProviders: string[]
  modelPath?: string
  modelData?: ArrayBuffer
  optimizationLevel?: 'all' | 'basic' | 'disabled'
  graphOptimizationLevel?: 'all' | 'basic' | 'disabled'
  enableCpuMemArena?: boolean
  enableMemPattern?: boolean
  executionMode?: 'sequential' | 'parallel'
  extra?: Record<string, any>
  webnnConfig?: {
    deviceType?: 'npu' | 'gpu' | 'cpu'
    deviceName?: string
    optimizationLevel?: 'all' | 'basic' | 'disabled'
  }
}

export interface ONNXSession {
  session: InferenceSession // Changed from ort.InferenceSession to any for flexibility
  modelId: string
  isLoaded: boolean
  provider: string
  inputNames: string[]
  outputNames: string[]
}

// Model URLs for downloading actual models
// Note: These are placeholder URLs. In a real implementation, you would need actual ONNX model URLs
// const MODEL_URLS: Record<string, string> = {
//   'tinyllama-1.1b-chat': 'https://huggingface.co/Xenova/TinyLlama-1.1B-Chat-v1.0/resolve/main/onnx/model.onnx',
//   'llama-2-7b-chat': 'https://huggingface.co/meta-llama/Llama-2-7b-chat-hf/resolve/main/model.onnx',
//   'llama-2-13b-chat': 'https://huggingface.co/meta-llama/Llama-2-13b-chat-hf/resolve/main/model.onnx',
//   'gpt-2-small': 'https://huggingface.co/gpt2/resolve/main/model.onnx'
// }

// Base class with shared ONNX logic
export abstract class BaseONNXHandler {
  protected sessions: Map<string, ONNXSession> = new Map();
  protected modelList?: ModelDataList;
  protected currentModelId: string | null = null
  protected availableProviders: string[] = []
  protected webnnUtils: WebNNUtils
  // protected modelCache: ModelCache
  protected ort?: typeof import('onnxruntime-web/all');

  abstract loadModel(modelId: string, onnxConfig?: ONNXProviderConfig): Promise<boolean>;
  abstract addApprovedModel(modelId: string, modelConfig?: Partial<ModelConfig>): Promise<boolean>;
  abstract generateResponse(message: string, options?: {
    maxTokens?: number
    temperature?: number
    topP?: number
  }): Promise<string>;
  abstract unloadModel(modelId: string): Promise<void>;
  

  constructor() {
    this.webnnUtils = WebNNUtils.getInstance()
    // this.modelCache = ModelCache.getInstance()
    this.initializeProviders()
  }

  protected async initializeProviders(): Promise<void> {
    try {
      // Get ONNX runtime
      if (!this.ort) {
        this.ort = await import('onnxruntime-web/all');
      }

      if (!this.modelList) {
        this.modelList = await import('@/utils/model.list.ts').then(({ModelDataList}) => {
          return new ModelDataList([]);
        });
      }

      await this.webnnUtils.initialize()
      
      const availableProviders = ['webnn', 'webgpu', 'wasm']
      console.log('Available ONNX providers:', availableProviders)
      
      this.availableProviders = this.getPreferredProviderOrder(availableProviders)
      
      // Configure ONNX environment
      if (this.ort && this.ort.env) {
        // Handle hardwareConcurrency more gracefully
        const numThreads = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) 
          ? navigator.hardwareConcurrency 
          : 4
        this.ort.env.wasm.numThreads = numThreads
        this.ort.env.wasm.simd = true
        this.ort.env.wasm.proxy = true
      }
      
      console.log('ONNX Handler initialized with providers:', this.availableProviders)
    } catch (error) {
      console.error('Failed to initialize ONNX providers:', error)
      this.availableProviders = ['wasm']
    }
  }

  protected getPreferredProviderOrder(availableProviders: string[]): string[] {
    const orderedProviders: string[] = []
    
    if (availableProviders.includes('webnn') && this.webnnUtils.isWebNNAvailable()) {
      const preferredDevice = this.webnnUtils.getPreferredDevice()
      if (preferredDevice) {
        console.log(`WebNN available with preferred device: ${preferredDevice.name} (${preferredDevice.type})`)
        orderedProviders.push('webnn')
      }
    }
    
    if (availableProviders.includes('webgpu')) {
      orderedProviders.push('webgpu')
    }
    
    if (availableProviders.includes('wasm')) {
      orderedProviders.push('wasm')
    }
    
    return orderedProviders.length > 0 ? orderedProviders : ['wasm']
  }


  protected async downloadModel(modelId: string): Promise<ArrayBuffer | null> {
    try {
      if(!this.modelList) {
        throw new Error('Model list not initialized');
      }
      const modelConfig = this.modelList.getModelConfig(modelId);
      if(!modelConfig) {
        throw new Error(`Model ${modelId} not found in approved model list`);
      }
      const { OnnxModelFetch } = await import('@/utils/model.list');
      const progressFn = ({type, msg, progress, part}: {type:string, msg: string, progress: number, part: string}) => {
        console.log(`${type}//${msg} ${progress} ${part}`);
      }
      const inflatedModelConfig = await OnnxModelFetch(modelConfig, progressFn);
      if(!inflatedModelConfig.modelData){
        throw new Error(`Model ${modelId} not loaded`);
      }

      console.log(`Downloaded model ${modelId} (${this.formatBytes((inflatedModelConfig.modelData as ArrayBuffer).byteLength)})`)
      
      
      return inflatedModelConfig.modelData as ArrayBuffer;
    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error)
      console.log(`This is expected for demo URLs. In a real implementation, you would use actual ONNX model URLs.`)
      return null
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Shared getter methods
  getCurrentModel(): string | null {
    return this.currentModelId
  }

  getCurrentProvider(): string | null {
    if (this.currentModelId) {
      const session = this.sessions.get(this.currentModelId)
      return session?.provider || null
    }
    return null
  }

  isModelLoaded(modelId: string): boolean {
    const session = this.sessions.get(modelId)
    return session?.isLoaded || false
  }

  getAvailableProviders(): string[] {
    return [...this.availableProviders]
  }

  getWebNNDevices(): any[] {
    return this.webnnUtils.getAvailableDevices()
  }

  getPreferredWebNNDevice(): any {
    return this.webnnUtils.getPreferredDevice()
  }

  getSessionInfo(modelId: string): ONNXSession | null {
    return this.sessions.get(modelId) || null
  }

  // Cache management methods
  async getCacheStats(): Promise<any> {
    return false
  }

  async getCachedModels(): Promise<any[]> {
    return []
  }

  async isModelCached(modelId: string): Promise<boolean> {
    return false
  }

  async removeCachedModel(modelId: string): Promise<boolean> {
    return false
  }

  async clearAllCachedModels(): Promise<boolean> {
    return false
  }

  async cleanupOldCachedModels(maxAge?: number): Promise<number> {
    return 0
  }

  async getCacheUsagePercentage(): Promise<number> {
    return 0
  }
}

export class ONNXProvider extends BaseONNXHandler {
  async addApprovedModel(modelId: string, modelConfig?: Partial<ModelConfig>): Promise<boolean> {
    if(!this.modelList){
      throw new Error('Model list not initialized');
    }
    this.modelList.addModel(modelId, modelConfig);
    return true;
  }

  async loadModel(modelId: string, config?: ONNXProviderConfig): Promise<boolean> {
    try {
      const sessionOptions: any = {
        executionProviders: config?.executionProviders || this.availableProviders,
        graphOptimizationLevel: config?.graphOptimizationLevel || 'all',
        enableCpuMemArena: config?.enableCpuMemArena ?? true,
        enableMemPattern: config?.enableMemPattern ?? true,
        executionMode: config?.executionMode || 'sequential',
        extra: config?.extra || {}
      }

      // Check if model is cached
      const cachedModel = this.modelList?.getModelConfig(modelId);
      let modelData: ArrayBuffer | undefined
      
      if (cachedModel && !!cachedModel.modelData) {
        console.log(`Loading cached model: ${modelId}`)
        modelData = cachedModel.modelData as ArrayBuffer;
      } else if (config?.modelData) {
        console.log(`Loading model ${modelId} from provided data`)
        modelData = config.modelData
        await this.modelCache.cacheModel(modelId, modelId, modelData, this.availableProviders[0] || 'wasm')
      } else {
        // Try to download the model if not cached
        console.log(`Model ${modelId} not cached, attempting to download...`)
        const downloadedModelData = await this.downloadModel(modelId)
        if (!downloadedModelData) {
          console.log(`No actual model available for ${modelId}, creating mock session for demonstration`)
          console.log(`In a real implementation, you would provide actual ONNX model files or URLs`)
          const session = await this.createMockSession(sessionOptions)
          const onnxSession: ONNXSession = {
            session,
            modelId,
            isLoaded: true,
            provider: this.availableProviders[0] || 'wasm',
            inputNames: session.inputNames || ['input'],
            outputNames: session.outputNames || ['output']
          }
          this.sessions.set(modelId, onnxSession)
          this.currentModelId = modelId
          return true
        }
        modelData = downloadedModelData
      }

      let session: any = null
      let provider = ''

      // Try each provider in order
      for (const providerName of this.availableProviders) {
        try {
          const options: any = {
            executionProviders: [providerName],
            graphOptimizationLevel: config?.graphOptimizationLevel || 'all',
            enableCpuMemArena: config?.enableCpuMemArena ?? true,
            enableMemPattern: config?.enableMemPattern ?? true,
            executionMode: config?.executionMode || 'sequential',
            extra: config?.extra || {}
          }

          if (config?.modelPath) {
            session = await this.ort.InferenceSession.create(config.modelPath, options)
          } else if (modelData) {
            session = await this.ort.InferenceSession.create(modelData, options)
          } else {
            console.log(`Creating mock session for provider: ${providerName}`)
            session = await this.createMockSession(options)
          }
          
          provider = providerName
          console.log(`Successfully loaded model with provider: ${providerName}`)
          break
        } catch (error) {
          console.warn(`Failed to load model with provider ${providerName}:`, error)
          continue
        }
      }

      if (!session) {
        throw new Error('Failed to load model with any available provider')
      }

      const onnxSession: ONNXSession = {
        session,
        modelId,
        isLoaded: true,
        provider,
        inputNames: session.inputNames || ['input'],
        outputNames: session.outputNames || ['output']
      }

      this.sessions.set(modelId, onnxSession)
      this.currentModelId = modelId

      console.log(`Model ${modelId} loaded successfully with provider: ${onnxSession.provider}`)
      return true
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error)
      return false
    }
  }

  async generateResponse(message: string, _options?: {
    maxTokens?: number
    temperature?: number
    topP?: number
  }): Promise<string> {
    if (!this.currentModelId) {
      throw new Error('No model loaded')
    }

    const session = this.sessions.get(this.currentModelId)
    if (!session || !session.isLoaded) {
      throw new Error(`Model ${this.currentModelId} is not loaded`)
    }

    try {
      // For demo purposes, return a mock response
      // In a real implementation, you would run actual inference
      const mockResponse = `Generated response for: "${message}" using model: ${this.currentModelId}. This is a mock response from the ONNX provider.`
      
      console.log('Generated response:', mockResponse)
      return mockResponse
    } catch (error) {
      console.error('Error generating response:', error)
      throw error
    }
  }

  async runInference(
    _input: any,
    _options?: any
  ): Promise<any> {
    if (!this.currentModelId) {
      throw new Error('No model loaded')
    }

    const session = this.sessions.get(this.currentModelId)
    if (!session || !session.isLoaded) {
      throw new Error(`Model ${this.currentModelId} is not loaded`)
    }

    try {
      // For demo purposes, return mock inference results
      // In a real implementation, you would run actual ONNX inference
      const mockResult = {
        output: new Float32Array([1, 2, 3, 4, 5])
      }
      
      console.log('Inference result:', mockResult)
      return mockResult
    } catch (error) {
      console.error('Error running inference:', error)
      throw error
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    const session = this.sessions.get(modelId)
    if (session) {
      try {
        if (session.session && typeof session.session.release === 'function') {
          session.session.release()
        }
        if (session.session && typeof session.session.dispose === 'function') {
          session.session.dispose()
        }
      } catch (error) {
        console.error(`Error releasing session for model ${modelId}:`, error)
      }
      
      this.sessions.delete(modelId)
      
      if (this.currentModelId === modelId) {
        this.currentModelId = null
      }
      
      console.log(`Model ${modelId} unloaded successfully`)
    }
  }

  async unloadAllModels(): Promise<void> {
    const modelIds = Array.from(this.sessions.keys())
    for (const modelId of modelIds) {
      await this.unloadModel(modelId)
    }
    console.log('All models unloaded')
  }
} 