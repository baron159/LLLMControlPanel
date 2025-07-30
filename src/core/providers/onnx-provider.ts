import * as ort from 'onnxruntime-web'
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
  session: ort.InferenceSession
  modelId: string
  isLoaded: boolean
  provider: string
  inputNames: string[]
  outputNames: string[]
}

export class ONNXProvider {
  private sessions: Map<string, ONNXSession> = new Map()
  private currentModelId: string | null = null
  private availableProviders: string[] = []
  // Provider priority order: webnn -> webgpu -> wasm
  private webnnUtils: WebNNUtils
  private modelCache: ModelCache

  constructor() {
    this.webnnUtils = WebNNUtils.getInstance()
    this.modelCache = ModelCache.getInstance()
    this.initializeProviders()
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Initialize WebNN utils
      await this.webnnUtils.initialize()
      
      // Check available providers - ONNX Runtime Web doesn't have getAvailableExecutionProviders
      // We'll use a predefined list and try them in order
      const availableProviders = ['webnn', 'webgpu', 'wasm']
      console.log('Available ONNX providers:', availableProviders)
      
      // Set up provider priority based on user preference
      this.availableProviders = this.getPreferredProviderOrder(availableProviders)
      
      // Configure ONNX environment
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4
      ort.env.wasm.simd = true
      ort.env.wasm.proxy = true
      
      console.log('ONNX Provider initialized with providers:', this.availableProviders)
    } catch (error) {
      console.error('Failed to initialize ONNX providers:', error)
      // Fallback to WASM only
      this.availableProviders = ['wasm']
    }
  }

  private getPreferredProviderOrder(availableProviders: string[]): string[] {
    const orderedProviders: string[] = []
    
    // First try webnn with npu, gpu priority
    if (availableProviders.includes('webnn') && this.webnnUtils.isWebNNAvailable()) {
      const preferredDevice = this.webnnUtils.getPreferredDevice()
      if (preferredDevice) {
        console.log(`WebNN available with preferred device: ${preferredDevice.name} (${preferredDevice.type})`)
        orderedProviders.push('webnn')
      }
    }
    
    // Then try webgpu
    if (availableProviders.includes('webgpu')) {
      orderedProviders.push('webgpu')
    }
    
    // Finally fallback to wasm
    if (availableProviders.includes('wasm')) {
      orderedProviders.push('wasm')
    }
    
    return orderedProviders.length > 0 ? orderedProviders : ['wasm']
  }

  async loadModel(modelId: string, config?: ONNXProviderConfig): Promise<boolean> {
    try {
      // Check if model is already loaded
      if (this.sessions.has(modelId) && this.sessions.get(modelId)?.isLoaded) {
        this.currentModelId = modelId
        return true
      }

      console.log(`Loading model: ${modelId} with providers:`, this.availableProviders)

      // Try to load from cache first
      const cachedModel = await this.modelCache.getCachedModel(modelId)
      let modelData: ArrayBuffer | undefined

      if (cachedModel) {
        console.log(`Loading model ${modelId} from cache`)
        modelData = cachedModel.data
      } else if (config?.modelData) {
        console.log(`Loading model ${modelId} from provided data`)
        modelData = config.modelData
        
        // Cache the model data for future use
        await this.modelCache.cacheModel(
          modelId,
          modelId, // Use modelId as name for now
          modelData,
          this.availableProviders[0] || 'wasm'
        )
      }

      // Try to load model with different providers
      let session: ort.InferenceSession | null = null
      let successfulProvider = ''

      for (const provider of this.availableProviders) {
        try {
          const sessionOptions: ort.InferenceSession.SessionOptions = {
            executionProviders: [provider],
            graphOptimizationLevel: config?.graphOptimizationLevel || 'all',
            enableCpuMemArena: config?.enableCpuMemArena ?? true,
            enableMemPattern: config?.enableMemPattern ?? true,
            executionMode: config?.executionMode || 'sequential',
            extra: config?.extra || {}
          }

          // Load model from path, cached data, or provided data
          if (config?.modelPath) {
            session = await ort.InferenceSession.create(config.modelPath, sessionOptions)
          } else if (modelData) {
            session = await ort.InferenceSession.create(modelData, sessionOptions)
          } else {
            // For demo purposes, we'll create a mock session
            // In real implementation, you would load actual ONNX model files
            console.log(`Creating mock session for provider: ${provider}`)
            session = await this.createMockSession(sessionOptions)
          }

          successfulProvider = provider
          console.log(`Successfully loaded model with provider: ${provider}`)
          break
        } catch (error) {
          console.warn(`Failed to load model with provider ${provider}:`, error)
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
        provider: successfulProvider,
        inputNames: [...session.inputNames],
        outputNames: [...session.outputNames]
      }

      this.sessions.set(modelId, onnxSession)
      this.currentModelId = modelId

      console.log(`Model ${modelId} loaded successfully with provider: ${successfulProvider}`)
      return true
    } catch (error) {
      console.error('Failed to load model:', error)
      return false
    }
  }

  private async createMockSession(_options: ort.InferenceSession.SessionOptions): Promise<ort.InferenceSession> {
    // This is a mock implementation for demo purposes
    // In a real implementation, you would load actual ONNX model files
    return {
      inputNames: ['input'],
      outputNames: ['output'],
      run: async (_feeds: ort.InferenceSession.FeedsType, _options?: ort.InferenceSession.RunOptions) => {
        // Mock inference
        return { output: new Float32Array([1.0]) }
      },
      release: () => {},
      dispose: () => {}
    } as any
  }

  async generateResponse(_message: string, _options?: {
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
      // For demo purposes, we'll simulate inference
      // In a real implementation, you would:
      // 1. Tokenize the input message
      // 2. Run inference with the ONNX session
      // 3. Decode the output tokens
      
      console.log(`Running inference with provider: ${session.provider}`)
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock response based on provider
      const responses = {
        webnn: "This response was generated using WebNN acceleration for optimal performance.",
        webgpu: "This response was generated using WebGPU acceleration for high-performance inference.",
        wasm: "This response was generated using WebAssembly for cross-platform compatibility."
      }
      
      const baseResponse = responses[session.provider as keyof typeof responses] || 
                          "This response was generated using ONNX Runtime."
      
      return `${baseResponse} (Model: ${this.currentModelId}, Provider: ${session.provider})`
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

  getCurrentModel(): string | null {
    return this.currentModelId
  }

  getCurrentProvider(): string | null {
    const session = this.sessions.get(this.currentModelId || '')
    return session?.provider || null
  }

  isModelLoaded(modelId: string): boolean {
    return this.sessions.has(modelId) && this.sessions.get(modelId)?.isLoaded === true
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

  getSessionInfo(modelId: string): ONNXSession | null {
    return this.sessions.get(modelId) || null
  }

  async unloadModel(modelId: string): Promise<void> {
    const session = this.sessions.get(modelId)
    if (session) {
      try {
        // ONNX Runtime Web sessions are automatically cleaned up
        // No explicit dispose method needed
        console.log(`Unloading model: ${modelId}`)
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