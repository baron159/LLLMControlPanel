# ONNX Architecture

This document explains the ONNX implementation architecture and why both `onnx-provider.ts` and `onnx-worker.ts` are needed.

## Architecture Overview

The ONNX implementation uses a shared base class approach to eliminate code duplication while maintaining two distinct execution contexts:

### 1. BaseONNXHandler (Shared Logic)
- **Location**: `src/core/providers/onnx-provider.ts`
- **Purpose**: Contains all shared ONNX logic, provider management, and cache operations
- **Features**:
  - Provider initialization and selection
  - WebNN device detection
  - Model cache management
  - Session management
  - Common getter methods

### 2. ONNXProvider (Main Thread)
- **Location**: `src/core/providers/onnx-provider.ts`
- **Purpose**: Direct ONNX operations in the main thread
- **Used by**: `ModelManager`
- **Advantages**:
  - Synchronous operations
  - Direct access to ONNX sessions
  - Lower latency for simple operations
  - Easier debugging
- **Disadvantages**:
  - Can block the UI during heavy operations
  - Limited by main thread performance

### 3. ONNXWorker (Web Worker)
- **Location**: `src/workers/onnx-worker.ts`
- **Purpose**: Heavy ONNX operations in a separate thread
- **Used by**: `LightweightModelManager`
- **Advantages**:
  - Non-blocking UI operations
  - Better performance for heavy computations
  - Isolated execution environment
  - Can handle large models without affecting UI
- **Disadvantages**:
  - Message passing overhead
  - More complex communication
  - Limited access to DOM/UI

## When to Use Each

### Use ONNXProvider (Main Thread) When:
- Loading small models quickly
- Simple inference operations
- Real-time interactions
- Debugging and development
- Operations that need direct UI access

### Use ONNXWorker (Web Worker) When:
- Loading large models (>100MB)
- Heavy inference operations
- Batch processing
- Background model operations
- Operations that could block the UI

## Code Sharing

Both implementations extend `BaseONNXHandler` to share:
- Provider initialization logic
- WebNN device detection
- Model cache operations
- Session management
- Common utility methods

This eliminates ~70% of code duplication while maintaining the flexibility to use either execution context.

## Example Usage

```typescript
// Main thread usage (ONNXProvider)
import { ONNXProvider } from './core/providers/onnx-provider'

const provider = new ONNXProvider()
await provider.loadModel('small-model')
const response = await provider.generateResponse('Hello')

// Worker usage (ONNXWorker)
import { LightweightModelManager } from './core/managers/lightweight-model-manager'

const manager = new LightweightModelManager()
await manager.loadModel('large-model')
const response = await manager.generateResponse('Hello')
```

## Performance Considerations

- **Small models (<50MB)**: Use ONNXProvider for lower latency
- **Large models (>100MB)**: Use ONNXWorker to prevent UI blocking
- **Real-time inference**: Use ONNXProvider for immediate responses
- **Batch processing**: Use ONNXWorker for background operations

## Future Enhancements

1. **Smart Provider Selection**: Automatically choose between provider and worker based on model size
2. **Hybrid Approach**: Use provider for small operations, worker for large ones
3. **Load Balancing**: Distribute operations across multiple workers
4. **Caching Strategy**: Share model cache between provider and worker contexts 