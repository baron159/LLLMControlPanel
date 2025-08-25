# Service Worker API Documentation

The LLM Control Panel service worker provides a centralized way to manage AI models, their configurations, and download state. It runs in the background and handles communication between different parts of the extension.

## Overview

The service worker maintains:
- Model configurations and metadata
- Current selected model
- Available execution providers (WebNN, WebGPU, WASM)
- WebNN device information
- Model download status

## Message API

The service worker communicates via Chrome's runtime messaging API. All messages follow this pattern:

```javascript
const response = await chrome.runtime.sendMessage({
  type: 'messageType',
  // additional parameters
});
```

### Available Message Types

#### 1. `status`

Returns the current state of the service worker.

**Request:**
```javascript
chrome.runtime.sendMessage({ type: 'status' })
```

**Response:**
```javascript
{
  success: true,
  data: {
    modelIds: string[],              // List of configured model IDs
    currentSelectedModel: string | null,  // Currently selected model
    availableProviders: string[],    // Available execution providers
    webnnDevices: any[],            // Available WebNN devices
    preferredDevice: any,           // Preferred WebNN device
    downloadedModels: string[]      // Models that are downloaded
  }
}
```

#### 2. `addModel`

Adds a new model configuration to the system.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'addModel',
  modelConfig: {
    modelId: 'microsoft/DialoGPT-medium',
    urlBase: 'https://huggingface.co',
    onnxDir: 'onnx',
    configFileName: 'config.json',
    repoBase: 'resolve/main',
    modelFileName: 'model.onnx',
    modelExDataFileName: 'model_external_data.bin' // optional
  }
})
```

**Response:**
```javascript
{
  success: boolean,
  message: string
}
```

Notes:
- Models added via this API are also stored in the service worker's `approvedModelConfigs` to mark them as user-approved immediately.

#### 3. `downloadModel`

Downloads a model that has been added to the configuration.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'downloadModel',
  modelId: 'microsoft/DialoGPT-medium'
})
```

**Response:**
```javascript
{
  success: boolean,
  message: string,
  progress?: number  // Download progress (0-100)
}
```

#### 4. `setSelectedModel`

Sets the currently selected model for inference.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'setSelectedModel',
  modelId: 'microsoft/DialoGPT-medium'
})
```

**Response:**
```javascript
{
  success: boolean,
  message: string
}
```

#### 5. `updateModel`

Updates an existing model configuration. Preserves the model's downloaded state when possible and keeps the approved list in sync.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'updateModel',
  modelConfig: {
    modelId: 'microsoft/DialoGPT-medium',
    urlBase: 'https://huggingface.co',
    onnxDir: 'onnx',
    configFileName: 'config.json',
    repoBase: 'resolve/main',
    modelFileName: 'model.onnx',
    modelExDataFileName: 'model_external_data.bin' // optional
  }
})
```

**Response:**
```javascript
{
  success: boolean,
  message: string
}
```

#### 6. `getApprovedApps`

Returns the list of approved third-party apps.

**Request:**
```javascript
chrome.runtime.sendMessage({ type: 'getApprovedApps' })
```

**Response:**
```javascript
{
  success: true,
  data: [
    {
      id: string,
      name: string,
      origin: string,
      description?: string,
      approvedAt: number,
      permissions: string[]
    }
  ]
}
```

#### 7. `refreshApprovedApps`

Reloads approved apps from storage and returns the current list. Useful for UI refresh controls.

**Request:**
```javascript
chrome.runtime.sendMessage({ type: 'refreshApprovedApps' })
```

**Response:**
```javascript
{
  success: true,
  data: [ /* same shape as getApprovedApps */ ]
}
```

#### 8. `approvalRequest`

Creates a pending approval request for a third-party application. Typically initiated by `window.llmCtl.requestApproval()` routed through the content script.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'approvalRequest',
  appInfo: {
    name: 'My App',
    origin: location.origin,
    description: 'Optional description',
    requestedPermissions: ['model-access', 'generate-response']
  }
})
```

**Response:**
```javascript
{
  success: boolean,
  message: string,
  requestId?: string
}
```

#### 9. `approvalResponse`

Sends the user's decision from the popup UI.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'approvalResponse',
  requestId: 'req_...',
  approved: true
})
```

**Response:**
```javascript
{
  success: boolean,
  message: string
}
```

#### 10. `checkAppApproval`

Checks whether an origin is currently approved.

**Request:**
```javascript
chrome.runtime.sendMessage({
  type: 'checkAppApproval',
  origin: location.origin
})
```

**Response:**
```javascript
{
  success: true,
  data: { approved: boolean }
}
```

## Model Configuration Format

The `ModelConfig` interface defines how models are configured:

```typescript
interface ModelConfig {
  modelId: string;                    // Unique identifier (e.g., 'user/repo')
  urlBase: string;                   // Base URL (default: 'https://huggingface.co')
  onnxDir: string;                   // ONNX directory (default: 'onnx')
  configFileName: string;            // Config file name (default: 'config.json')
  repoBase: string;                  // Repository base path (default: 'resolve/main')
  modelFileName: string;             // Model file name (default: 'model.onnx')
  modelExDataFileName?: string;      // External data file (optional)
  
  // Runtime properties (set by service worker)
  configData?: any;                  // Loaded configuration
  modelData?: ArrayBuffer | Blob;    // Model binary data
  externalData?: { path: string, data: ArrayBuffer | Blob }[];
}
```

## Usage Examples

### Basic Model Management

```javascript
// Add a new model
const addResult = await chrome.runtime.sendMessage({
  type: 'addModel',
  modelConfig: {
    modelId: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
    urlBase: 'https://huggingface.co',
    onnxDir: 'onnx',
    configFileName: 'config.json',
    repoBase: 'resolve/main',
    modelFileName: 'model.onnx'
  }
});

if (addResult.success) {
  // Download the model
  const downloadResult = await chrome.runtime.sendMessage({
    type: 'downloadModel',
    modelId: 'Xenova/TinyLlama-1.1B-Chat-v1.0'
  });
  
  if (downloadResult.success) {
    // Set as selected model
    await chrome.runtime.sendMessage({
      type: 'setSelectedModel',
      modelId: 'Xenova/TinyLlama-1.1B-Chat-v1.0'
    });
  }
}
```

### Checking System Status

```javascript
const status = await chrome.runtime.sendMessage({ type: 'status' });

console.log('Available models:', status.data.modelIds);
console.log('Selected model:', status.data.currentSelectedModel);
console.log('Downloaded models:', status.data.downloadedModels);
console.log('Available providers:', status.data.availableProviders);
```

## Storage

The service worker persists data using:
- **Chrome Storage API**: For model configurations and settings
- **IndexedDB**: For downloaded model binaries and chunks
- **Cache API**: For configuration files and metadata

## Error Handling

All service worker responses include a `success` boolean and `message` string. Always check the `success` field before proceeding:

```javascript
const response = await chrome.runtime.sendMessage({ type: 'status' });

if (response.success) {
  // Handle successful response
  console.log('Data:', response.data);
} else {
  // Handle error
  console.error('Error:', response.message);
}
```

## Future Enhancements

The service worker is designed to be extended with:
- Model inference coordination with Web Workers
- Progress tracking for downloads
- Model caching and cleanup policies
- Performance monitoring
- Model validation and security checks

## Testing

Use the provided `test-service-worker.js` script to test the service worker functionality:

1. Load the extension in Chrome
2. Open the browser console
3. Run the test script to verify all message types work correctly