# ONNX Runtime Web Implementation

This document describes the implementation of ONNX Runtime Web in the LLM Control Panel extension with the specified provider priority.

## Provider Priority

The implementation follows this provider priority order:

1. **WebNN** (with NPU/GPU priority)
2. **WebGPU** 
3. **WASM** (fallback)

## Architecture

### Core Components

#### 1. ONNX Provider (`src/core/providers/onnx-provider.ts`)
- Main provider class that manages ONNX Runtime Web sessions
- Handles provider selection and fallback logic
- Manages model loading and inference
- Integrates with WebNN utilities for device detection

#### 2. Model Manager (`src/core/managers/model-manager.ts`)
- High-level interface for model operations
- Manages model configurations and status
- Provides easy-to-use API for loading/unloading models
- Handles model inference requests

#### 3. WebNN Utils (`src/utils/webnn-utils.ts`)
- WebNN-specific utilities for device detection
- Manages NPU/GPU/CPU device priority
- Provides device capability information
- Handles WebNN context creation

### Provider Selection Logic

```typescript
// Priority order implementation
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
```

## Device Priority (WebNN)

When WebNN is available, the system prioritizes devices in this order:

1. **NPU** (Neural Processing Unit) - Highest priority
   - Qualcomm Snapdragon NPU
   - MediaTek Dimensity NPU
   - Apple Neural Engine
   - Other AI accelerators

2. **GPU** (Graphics Processing Unit) - Medium priority
   - WebGPU-compatible GPUs
   - High-performance graphics cards

3. **CPU** (Central Processing Unit) - Lowest priority
   - Fallback for when no specialized hardware is available

## Usage Examples

### Loading a Model

```typescript
import { ModelManager } from './core/managers/model-manager'

const modelManager = new ModelManager()

// Load a model with automatic provider selection
const success = await modelManager.loadModel('tinyllama-1.1b-chat')
if (success) {
  console.log('Model loaded successfully')
}
```

### Generating Responses

```typescript
// Generate a response using the loaded model
const response = await modelManager.generateResponse('Hello, how are you?')
console.log(response)
```

### Checking Provider Status

```typescript
// Get current provider information
const currentProvider = modelManager.getCurrentProvider()
const availableProviders = modelManager.getAvailableProviders()

console.log(`Current provider: ${currentProvider}`)
console.log(`Available providers: ${availableProviders.join(', ')}`)
```

## Configuration

### Model Configuration

```typescript
const modelConfig = {
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
}
```

### WebNN Configuration

```typescript
const webnnConfig = {
  deviceType: 'npu', // 'npu' | 'gpu' | 'cpu'
  deviceName: 'qualcomm-npu',
  optimizationLevel: 'all',
  enableQuantization: true,
  enablePruning: true
}
```

## Background Script Integration

The background script (`src/background/index.ts`) has been updated to use the new ModelManager:

```typescript
import { ModelManager } from '../core/managers/model-manager'

const modelManager = new ModelManager()

// Handle model loading requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'load-model') {
    handleLoadModel(message, sendResponse)
    return true
  }
  
  if (message.type === 'generate-response') {
    handleGenerateResponse(message, sendResponse)
    return true
  }
  
  // ... other handlers
})
```

## Testing

A test page (`test-onnx.html`) is provided to demonstrate the ONNX runtime integration:

- Provider availability detection
- Model loading/unloading
- Inference testing
- System information display

To test the implementation:

1. Open `test-onnx.html` in a browser
2. Check provider availability
3. Load different models
4. Test inference with various inputs

## Browser Compatibility

### WebNN Support
- Chrome/Chromium: Experimental support (enable flags)
- Edge: Experimental support
- Firefox: Not yet supported
- Safari: Not yet supported

### WebGPU Support
- Chrome/Chromium: Available (with flags)
- Edge: Available
- Firefox: Not yet supported
- Safari: Not yet supported

### WASM Support
- All modern browsers: Fully supported

## Performance Considerations

1. **Provider Selection**: The system automatically selects the best available provider
2. **Model Loading**: Models are loaded on-demand and cached
3. **Memory Management**: Sessions are properly disposed when no longer needed
4. **Fallback Strategy**: Automatic fallback to lower-priority providers if higher ones fail

## Error Handling

The implementation includes comprehensive error handling:

- Provider initialization failures
- Model loading errors
- Inference failures
- Device compatibility issues

All errors are logged and appropriate fallback strategies are employed.

## Future Enhancements

1. **Real Model Loading**: Replace mock sessions with actual ONNX model loading
2. **Tokenization**: Implement proper text tokenization for language models
3. **Quantization**: Add support for quantized models
4. **Model Caching**: Implement persistent model caching
5. **Performance Monitoring**: Add performance metrics and monitoring
6. **Multi-Model Support**: Support for loading multiple models simultaneously

## Model Caching

The implementation includes a comprehensive persistent caching system that stores model data in the browser's local storage.

### Cache Features

#### 1. Persistent Storage (`src/utils/model-cache.ts`)
- **Chrome Storage**: Uses `chrome.storage.local` for persistent storage
- **Data Integrity**: SHA-256 checksums for data integrity verification
- **Metadata Management**: Tracks model information, timestamps, and usage
- **Size Management**: Monitors cache usage and available space

#### 2. Cache Operations
```typescript
// Cache a model
await modelCache.cacheModel(modelId, modelName, modelData, provider)

// Retrieve cached model
const cachedModel = await modelCache.getCachedModel(modelId)

// Check if model is cached
const isCached = await modelCache.isModelCached(modelId)

// Get cache statistics
const stats = await modelCache.getCacheStats()
```

#### 3. Cache Management
- **Automatic Caching**: Models are automatically cached when loaded
- **Cache Retrieval**: Models are loaded from cache when available
- **Cleanup**: Automatic cleanup of old models
- **Size Limits**: Respects Chrome extension storage limits (5MB)

#### 4. Cache Statistics
```typescript
interface CacheStats {
  totalSize: number      // Total size of cached models
  modelCount: number     // Number of cached models
  availableSpace: number // Available storage space
}
```

### Cache Integration

The ONNX provider automatically integrates with the cache:

1. **Load from Cache**: When loading a model, check cache first
2. **Cache on Load**: When loading new model data, cache it automatically
3. **Fallback**: If cache miss, load from original source and cache for next time
4. **Integrity Check**: Verify cached data integrity with checksums

### Cache Management API

```typescript
// Get cache statistics
const stats = await modelManager.getCacheStats()

// Get list of cached models
const cachedModels = await modelManager.getCachedModels()

// Remove specific cached model
await modelManager.removeCachedModel('model-id')

// Clear all cached models
await modelManager.clearAllCachedModels()

// Cleanup old models (default: 30 days)
const removedCount = await modelManager.cleanupOldCachedModels()
```

## Dependencies

- `onnxruntime-web`: ONNX Runtime Web library
- TypeScript: For type safety and better development experience
- Chrome Extension APIs: For extension functionality
- Chrome Storage API: For persistent model caching

## Building and Deployment

The implementation is integrated into the existing build system:

```bash
# Development
npm run dev

# Build
npm run build

# Type checking
npm run type-check
```

The ONNX runtime components are properly bundled with the extension and will be available in the built extension. 