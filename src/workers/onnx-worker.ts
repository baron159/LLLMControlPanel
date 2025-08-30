/**
 * ONNX Worker for LLM Control Panel Extension
 * Handles model inference in a separate worker thread
 */

// Import types and provider
import type { ModelConfig } from '../core/utils/model.list';
import type { InferenceSession } from 'onnxruntime-web/all';
import type { PreTrainedTokenizer } from '@huggingface/transformers';

interface WorkerMessage {
  type: 'loadModel' | 'inference' | 'unloadModel' | 'status';
  payload?: any;
  id?: string;
}

interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  payload?: any;
  id?: string;
}

interface ONNXSession {
  session: InferenceSession;
  modelId: string;
  isLoaded: boolean;
  provider: string;
  inputNames: string[];
  outputNames: string[];
}

// Worker-safe ONNX provider that doesn't access browser APIs
class WorkerONNXProvider {
  private sessions: Map<string, ONNXSession> = new Map();
  private ort?: typeof import('onnxruntime-web/all');
  private tokenizers: Map<string, PreTrainedTokenizer> = new Map();
  
  async initialize(): Promise<void> {
    if (!this.ort) {
      this.ort = await import('onnxruntime-web/all');
      
      // Configure ONNX environment for worker context
      if (this.ort && this.ort.env) {
        this.ort.env.wasm.numThreads = 4; // Default to 4 threads in worker
        this.ort.env.wasm.simd = true;
        this.ort.env.wasm.proxy = true;
      }
    }
  }
  
  async loadModel(modelId: string, config: ModelConfig): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.ort) {
        throw new Error('ONNX runtime not initialized');
      }
      
      // Check if model is already loaded
      if (this.sessions.has(modelId) && this.sessions.get(modelId)?.isLoaded) {
        console.log(`Model ${modelId} already loaded`);
        return true;
      }
      
      console.log(`Loading model: ${modelId}`);
      
      // Load model data from storage
      const { loadOrFetchModel } = await import('../core/utils/fetchchunkstore');
      const { loadModelConfig } = await import('../core/utils/model.list');
      
      let modelData: ArrayBuffer;
      try {
        modelData = await loadOrFetchModel(
          `${config.urlBase}/${config.modelId}/${config.repoBase}/${config.onnxDir}/${config.modelFileName}`,
          config.modelId
        );
      } catch (error) {
        console.error(`Failed to load model data for ${modelId}:`, error);
        return false;
      }
      
      // Load config data
      let configData: any;
      try {
        configData = await loadModelConfig(config.modelId);
      } catch (error) {
        console.error(`Failed to load config data for ${modelId}:`, error);
        return false;
      }
      
      if (!configData) {
        console.error(`Model ${modelId} config data could not be resolved`);
        return false;
      }
      
      // Store config data for inference (basic implementation)
      // Note: Advanced features like EOS token handling, KV cache dimensions
      // can be added here when implementing more sophisticated generation
      
      // Load tokenizer in worker context
  try {
    console.log(`Loading tokenizer for ${modelId}`);
    
    // Import transformers dynamically to avoid build issues
    const { AutoTokenizer } = await import('@huggingface/transformers');
    
    // Load tokenizer with worker-compatible options
     const tokenizer = await AutoTokenizer.from_pretrained(modelId, {
       // Disable DOM-dependent features
       local_files_only: false,
       // Ensure worker compatibility
       revision: 'main'
     });
    
    this.tokenizers.set(modelId, tokenizer);
    console.log(`Tokenizer loaded successfully for ${modelId}`);
  } catch (error) {
    console.error(`Failed to load tokenizer for ${modelId}:`, error);
    return false;
  }
      
      // Load external data if exists
      let externalData: { path: string, data: ArrayBuffer }[] | undefined;
      if (config.modelExDataFileName) {
        try {
          const { loadData } = await import('../core/utils/fetchchunkstore');
          const externalDataBuffer = await loadData(`${config.modelId}_external`);
          if (externalDataBuffer) {
            externalData = [{ path: `./${config.modelExDataFileName}`, data: externalDataBuffer }];
          }
        } catch (error) {
          console.warn(`Failed to load external data for ${modelId}:`, error);
        }
      }
      
      // Create ONNX session
      const sessionOptions: any = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
        executionMode: 'sequential',
        externalData
      };
      
      const session = await this.ort.InferenceSession.create(modelData, sessionOptions);
      
      // Store session info
      const onnxSession: ONNXSession = {
        session,
        modelId,
        isLoaded: true,
        provider: 'wasm',
        inputNames: [...session.inputNames],
        outputNames: [...session.outputNames]
      };
      
      this.sessions.set(modelId, onnxSession);
      console.log(`Model ${modelId} loaded successfully`);
      return true;
      
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      return false;
    }
  }
  
  async generateResponse(modelId: string, message: string, _options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  }): Promise<string> {
    const session = this.sessions.get(modelId);
    if (!session || !session.isLoaded) {
      throw new Error(`Model ${modelId} is not loaded`);
    }
    
    const tokenizer = this.tokenizers.get(modelId);
    if (!tokenizer) {
      throw new Error(`Tokenizer for model ${modelId} is not loaded`);
    }
    
    if (!this.ort) {
      throw new Error('ONNX runtime not initialized');
    }
    
    try {
      console.log('Generating response for:', message);
      
      // Encode the input message
      const inputs = await tokenizer.encode(message);
      console.log('Encoded inputs:', inputs);
      
      // Prepare input tensor
      const inputIds = new BigInt64Array(inputs.map(id => BigInt(id)));
      const feeds: Record<string, any> = {};
      
      // Use the first input name from the session
      if (session.inputNames.length > 0) {
        feeds[session.inputNames[0]] = new this.ort.Tensor('int64', inputIds, [1, inputIds.length]);
      } else {
        throw new Error('No input names found in session');
      }
      
      // Run inference
      console.log('Running inference with feeds:', Object.keys(feeds));
      const results = await session.session.run(feeds);
      console.log('Inference results:', Object.keys(results));
      
      // Get output tensor
      const outputName = session.outputNames[0];
      if (!outputName || !results[outputName]) {
        throw new Error('No valid output found');
      }
      
      const outputTensor = results[outputName];
      console.log('Output tensor shape:', outputTensor.dims);
      
      // For basic implementation, just take the last token prediction
      const outputData = outputTensor.data as Float32Array;
      
      // Find the token with highest probability (argmax)
      let maxIndex = 0;
      let maxValue = outputData[0];
      for (let i = 1; i < outputData.length; i++) {
        if (outputData[i] > maxValue) {
          maxValue = outputData[i];
          maxIndex = i;
        }
      }
      
      // Decode the predicted token
      const decodedText = await tokenizer.decode([maxIndex]);
      console.log('Decoded text:', decodedText);
      
      // Return response with decoded token
      const response = `${message} ${decodedText}`.trim();
      console.log('Generated response:', response);
      return response;
      
    } catch (error) {
      console.error('Error generating response:', error);
      // Fallback to a basic response if inference fails
      return `Echo: ${message} (inference failed, using fallback)`;
    }
  }
  
  async unloadModel(modelId: string): Promise<void> {
    this.sessions.delete(modelId);
    console.log(`Unloaded model: ${modelId}`);
  }
  
  isModelLoaded(modelId: string): boolean {
    return this.sessions.has(modelId);
  }
  
  getAvailableProviders(): string[] {
    return ['wasm']; // Only WASM is guaranteed in worker context
  }
  
  getCurrentProvider(): string | null {
    return 'wasm';
  }
}

class ONNXWorker {
  private onnxProvider: WorkerONNXProvider;
  private currentModel: string | null = null;

  constructor() {
    console.log('ONNX Worker initialized');
    this.onnxProvider = new WorkerONNXProvider();
  }

  async handleMessage(message: WorkerMessage): Promise<WorkerResponse> {
    try {
      switch (message.type) {
        case 'loadModel':
          return await this.loadModel(message.payload);
          
        case 'inference':
          return await this.runInference(message.payload);
          
        case 'unloadModel':
          return await this.unloadModel(message.payload);
          
        case 'status':
          return this.getStatus();
          
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      return {
        type: 'error',
        payload: { message: error instanceof Error ? error.message : 'Unknown error' },
        id: message.id
      };
    }
  }

  private async loadModel(config: ModelConfig): Promise<WorkerResponse> {
    console.log('Loading model:', config.modelId);
    
    try {
      // Use ONNXProvider to load the model
      const success = await this.onnxProvider.loadModel(config.modelId, config);
      
      if (!success) {
        throw new Error(`Failed to load model ${config.modelId}`);
      }
      
      this.currentModel = config.modelId;
      console.log(`Model ${config.modelId} loaded successfully via ONNXProvider`);
      
      return {
        type: 'success',
        payload: {
          modelId: config.modelId,
          loaded: true
        }
      };
      
    } catch (error) {
      console.error(`Failed to load model ${config.modelId}:`, error);
      throw error;
    }
  }

  private async runInference(payload: { input: string; options?: any }): Promise<WorkerResponse> {
    console.log('Running inference with input:', payload.input);
    
    if (!this.currentModel) {
      throw new Error('No model loaded');
    }
    
    try {
      // Use ONNXProvider to generate response
      const response = await this.onnxProvider.generateResponse(this.currentModel, payload.input, payload.options);
      
      return {
        type: 'success',
        payload: { response }
      };
    } catch (error) {
      console.error('Inference error:', error);
      throw error;
    }
  }

  private async unloadModel(modelId: string): Promise<WorkerResponse> {
    console.log('Unloading model:', modelId);
    
    try {
      await this.onnxProvider.unloadModel(modelId);
      
      if (this.currentModel === modelId) {
        this.currentModel = null;
      }
      
      return {
        type: 'success',
        payload: { modelId, unloaded: true }
      };
    } catch (error) {
      console.error('Error unloading model:', error);
      throw error;
    }
  }

  private getStatus(): WorkerResponse {
    return {
      type: 'success',
      payload: {
        currentModel: this.currentModel,
        isModelLoaded: this.onnxProvider.isModelLoaded(this.currentModel || ''),
        availableProviders: this.onnxProvider.getAvailableProviders(),
        currentProvider: this.onnxProvider.getCurrentProvider()
      }
    };
  }


}

// Initialize worker
const onnxWorker = new ONNXWorker();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const response = await onnxWorker.handleMessage(event.data);
  self.postMessage(response);
};

// Handle worker errors
self.onerror = (error) => {
  console.error('ONNX Worker error:', error);
  self.postMessage({
    type: 'error',
    payload: { message: 'Worker error occurred' }
  });
};

export {}; // Make this a module