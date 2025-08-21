# Service Worker Implementation

This document provides detailed technical information about the LLM Control Panel service worker implementation.

## Overview

The service worker (`src/background/tiny-background.ts`) serves as the core background process for the LLM Control Panel extension. It manages model configurations, downloads, provider detection, and maintains application state.

## Architecture

### Core Components

1. **WebNN Integration**: Utilizes `WebNNUtils` for hardware acceleration detection
2. **Model Management**: Handles `ModelConfig` objects from the model list
3. **Storage Layer**: Integrates with Chrome Storage API and IndexedDB
4. **Message Handler**: Processes inter-component communication

### Dependencies

- `WebNNUtils` from `core/utils/webnn-utils.ts` - Device and provider detection
- `ModelConfig` and `OnnxModelFetch` from `core/utils/model.list.ts` - Model definitions and fetching
- `loadOrFetchModel` from `core/utils/fetchchunkstore.ts` - Model storage and retrieval
- Chrome Extension APIs - Storage, runtime messaging

## Initialization Process

### Startup Sequence

1. **Provider Detection**: Checks available execution providers (WebNN, WebGPU, WASM)
2. **Device Enumeration**: Identifies available compute devices
3. **Storage Loading**: Retrieves existing model configurations from Chrome storage
4. **Model Verification**: Checks IndexedDB for downloaded models
5. **Default Models**: Adds default models if none exist

```typescript
// Initialization flow
const webnnUtils = new WebNNUtils();
const providers = await webnnUtils.getAvailableProviders();
const devices = await webnnUtils.getAvailableDevices();
const storedModels = await chrome.storage.local.get('models');
```

## Message API

### Message Types

#### `status`
Returns comprehensive system status including:
- Available models list
- Currently selected model
- Available providers and devices
- Download status for each model

**Request:**
```javascript
{type: 'status'}
```

**Response:**
```javascript
{
  success: true,
  models: ModelConfig[],
  selectedModel: string | null,
  providers: string[],
  devices: string[],
  downloads: {[modelId: string]: boolean}
}
```

#### `addModel`
Adds a new model configuration without downloading.

**Request:**
```javascript
{
  type: 'addModel',
  model: {
    id: string,
    name: string,
    url: string,
    size: string,
    description?: string
  }
}
```

**Response:**
```javascript
{
  success: boolean,
  message?: string
}
```

#### `downloadModel`
Initiates download of a model by ID.

**Request:**
```javascript
{
  type: 'downloadModel',
  modelId: string
}
```

**Response:**
```javascript
{
  success: boolean,
  message?: string
}
```

#### `setSelectedModel`
Sets the currently selected model for inference.

**Request:**
```javascript
{
  type: 'setSelectedModel',
  modelId: string
}
```

**Response:**
```javascript
{
  success: boolean,
  message?: string
}
```

## State Management

### Persistent State

Stored in Chrome Storage API:
- `models`: Array of ModelConfig objects
- `selectedModel`: Currently selected model ID
- `settings`: Extension configuration

### Runtime State

Maintained in service worker memory:
- `availableProviders`: Detected execution providers
- `availableDevices`: Available compute devices
- `downloadStatus`: Current download states

### Storage Integration

#### Chrome Storage
```typescript
// Save models
await chrome.storage.local.set({models: modelConfigs});

// Load models
const result = await chrome.storage.local.get('models');
const models = result.models || [];
```

#### IndexedDB (via fetchchunkstore)
```typescript
// Check if model is downloaded
const isDownloaded = await checkModelDownloaded(modelId);

// Download model
const success = await loadOrFetchModel(modelConfig.url, modelId);
```

## Error Handling

### Validation

- Model ID uniqueness validation
- Required field validation for ModelConfig
- URL format validation

### Error Responses

All message handlers return structured error responses:
```javascript
{
  success: false,
  message: "Descriptive error message"
}
```

### Common Error Scenarios

1. **Duplicate Model ID**: When adding a model with existing ID
2. **Invalid Model Config**: Missing required fields
3. **Download Failure**: Network or storage issues
4. **Provider Unavailable**: Requested provider not supported

## Performance Considerations

### Memory Management

- Service worker maintains minimal state
- Large model data stored in IndexedDB
- Lazy loading of model configurations

### Network Optimization

- Chunked model downloads via `fetchchunkstore`
- Cache integration via `fetchncache`
- Progress tracking for large downloads

### Provider Selection

- Automatic optimal provider detection
- Fallback to WASM if hardware acceleration unavailable
- Device-specific optimizations

## Future Enhancements

### Web Worker Integration

The service worker is designed to work with a dedicated Web Worker (`src/workers/onnx-worker.ts`) for model execution:

1. **Model Loading**: Service worker manages model availability
2. **Inference Requests**: Forwarded to Web Worker
3. **Resource Management**: Coordinated between service worker and Web Worker

### Planned Features

- Model quantization support
- Batch inference capabilities
- Model caching strategies
- Performance monitoring
- Usage analytics

## Testing

### Unit Testing

Test individual message handlers:
```javascript
// Test status message
const response = await chrome.runtime.sendMessage({type: 'status'});
assert(response.success === true);
```

### Integration Testing

Test complete workflows:
1. Add model → Download model → Set selected → Get status
2. Provider detection → Device enumeration → Model loading

### Test Script

Use the provided test script:
```bash
node test-service-worker.js
```

## Debugging

### Chrome DevTools

1. Open `chrome://extensions/`
2. Click "Inspect views: background page"
3. Use Console and Network tabs for debugging

### Logging

The service worker includes comprehensive logging:
```typescript
console.log('[ServiceWorker] Initialization complete');
console.error('[ServiceWorker] Error:', error.message);
```

### Common Issues

1. **Service Worker Not Starting**: Check manifest.json configuration
2. **Message Not Received**: Verify message format and listener registration
3. **Storage Issues**: Check Chrome storage permissions
4. **Provider Detection Fails**: Verify WebNN utilities integration

## Security Considerations

### Content Security Policy

The extension follows strict CSP guidelines:
- No inline scripts
- Restricted external resource loading
- Secure model URL validation

### Data Privacy

- All model processing occurs locally
- No data transmitted to external servers
- User consent for model downloads

### Permission Management

- Minimal required permissions
- Storage access limited to extension data
- No sensitive API access