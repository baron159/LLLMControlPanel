// Dynamic import for ONNX runtime to handle service worker context
let ort: any = null

async function getONNXRuntime() {
  if (!ort) {
    try {
      // Check if we're in a service worker context
      if (typeof window === 'undefined') {
        console.log('Running in service worker context, using mock ONNX runtime')
        ort = {
          InferenceSession: {
            create: async () => ({
              inputNames: ['input'],
              outputNames: ['output'],
              run: async () => ({ output: new Float32Array([1]) }),
              release: () => {},
              dispose: () => {}
            })
          },
          env: {
            wasm: {
              numThreads: 4,
              simd: true,
              proxy: true
            }
          }
        }
      } else {
        ort = await import('onnxruntime-web')
      }
    } catch (error) {
      console.error('Failed to import ONNX runtime:', error)
      // Fallback to mock ONNX runtime
      ort = {
        InferenceSession: {
          create: async () => ({
            inputNames: ['input'],
            outputNames: ['output'],
            run: async () => ({ output: new Float32Array([1]) }),
            release: () => {},
            dispose: () => {}
          })
        },
        env: {
          wasm: {
            numThreads: 4,
            simd: true,
            proxy: true
          }
        }
      }
    }
  }
  return ort
}

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
  session: any // Changed from ort.InferenceSession to any for flexibility
  modelId: string
  isLoaded: boolean
  provider: string
  inputNames: string[]
  outputNames: string[]
}

// Base class with shared ONNX logic
export abstract class BaseONNXHandler {
  protected sessions: Map<string, ONNXSession> = new Map()
  protected currentModelId: string | null = null
  protected availableProviders: string[] = []
  protected webnnUtils: WebNNUtils
  protected modelCache: ModelCache
  protected ort: any = null

  constructor() {
    this.webnnUtils = WebNNUtils.getInstance()
    this.modelCache = ModelCache.getInstance()
    this.initializeProviders()
  }

  protected async initializeProviders(): Promise<void> {
    try {
      // Get ONNX runtime
      this.ort = await getONNXRuntime()
      
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

  protected async createMockSession(_options: any): Promise<any> {
    return {
      inputNames: ['input'],
      outputNames: ['output'],
      run: async (_feeds: any, _options?: any) => ({ output: new Float32Array([1]) }),
      release: () => {},
      dispose: () => {}
    }
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
    return await this.modelCache.getCacheStats()
  }

  async getCachedModels(): Promise<any[]> {
    return await this.modelCache.getCachedModels()
  }

  async isModelCached(modelId: string): Promise<boolean> {
    return await this.modelCache.isModelCached(modelId)
  }

  async removeCachedModel(modelId: string): Promise<boolean> {
    return await this.modelCache.removeCachedModel(modelId)
  }

  async clearAllCachedModels(): Promise<boolean> {
    return await this.modelCache.clearAllCachedModels()
  }

  async cleanupOldCachedModels(maxAge?: number): Promise<number> {
    return await this.modelCache.cleanupOldModels(maxAge)
  }

  async getCacheUsagePercentage(): Promise<number> {
    return await this.modelCache.getCacheUsagePercentage()
  }
}

export class ONNXProvider extends BaseONNXHandler {
  async loadModel(modelId: string, config?: ONNXProviderConfig): Promise<boolean> {
    try {
      // Ensure ONNX runtime is loaded
      if (!this.ort) {
        this.ort = await getONNXRuntime()
      }

      const sessionOptions: any = {
        executionProviders: config?.executionProviders || this.availableProviders,
        graphOptimizationLevel: config?.graphOptimizationLevel || 'all',
        enableCpuMemArena: config?.enableCpuMemArena ?? true,
        enableMemPattern: config?.enableMemPattern ?? true,
        executionMode: config?.executionMode || 'sequential',
        extra: config?.extra || {}
      }

      // Check if model is cached
      const cachedModel = await this.modelCache.getCachedModel(modelId)
      let session: any

      if (cachedModel) {
        console.log(`Loading cached model: ${modelId}`)
        session = await this.ort.InferenceSession.create(cachedModel, sessionOptions)
      } else {
        // For demo purposes, create a mock session
        // In a real implementation, you would load the actual model file
        console.log(`Creating mock session for model: ${modelId}`)
        session = await this.createMockSession(sessionOptions)
      }

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