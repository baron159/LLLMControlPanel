# Chrome Extension API Removal

This document describes the changes made to remove the dependency on Chrome extension APIs for page-level communication and replace it with a comprehensive page-level API.

## Overview

The project has been updated to provide a clean, page-level API that websites can use without needing to access Chrome extension APIs directly. This makes the extension more user-friendly and easier to integrate into web applications.

## Changes Made

### 1. Enhanced Page-Level API (`src/api.js`)

The API has been significantly expanded to include all functionality previously available through Chrome extension APIs:

```javascript
window.llmControlPanel = {
  // Availability check
  async isAvailable() { ... },
  
  // Core functionality
  async generateResponse(prompt, modelId) { ... },
  async testModel(modelId, message) { ... },
  
  // Model management
  async loadModel(modelId, useWorker) { ... },
  async unloadModel(modelId, useWorker) { ... },
  async getAvailableModels() { ... },
  
  // Provider information
  async getAvailableProviders() { ... },
  async getWebNNDevices() { ... },
  async getPreferredWebNNDevice() { ... },
  
  // Cache management
  async getCacheStats() { ... },
  async getCachedModels() { ... },
  async clearAllCachedModels() { ... },
  async cleanupOldCachedModels(maxAge) { ... },
  
  // Generic request method
  async sendRequest(action, data) { ... }
}
```

### 2. Updated Content Script (`src/content/index.ts`)

The content script now handles all API requests through a switch statement, maintaining the same functionality while using postMessage for communication:

- Added support for all new API methods
- Improved error handling
- Added timeout protection (30 seconds)
- Better response formatting

### 3. Enhanced Background Script (`src/background/tiny-background.ts`)

Added a new `handlePing` function to support the availability check:

```javascript
async function handlePing(_message: any, sendResponse: (response: any) => void) {
  try {
    sendResponse({ success: true })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}
```

### 4. Updated Test Page (`test-onnx.html`)

The test page has been completely refactored to use the new page-level API:

- Removed all `chrome.runtime.sendMessage` calls
- Added comprehensive API method mapping
- Improved error handling and status reporting
- Better extension availability detection

### 5. New Example File (`example-usage.html`)

Created a comprehensive example demonstrating all API features:

- Extension availability checking
- Model loading and unloading
- Response generation
- Provider information
- Cache management
- Error handling

## Benefits

### 1. **No Chrome Extension API Dependency**
Websites can now use the extension without needing to access Chrome extension APIs directly. This makes integration much simpler and more reliable.

### 2. **Comprehensive API**
All functionality is now available through a single, well-documented API object.

### 3. **Better Error Handling**
Improved error messages and timeout protection make debugging easier.

### 4. **Easier Integration**
The new API is more intuitive and follows standard JavaScript patterns.

## Usage Examples

### Basic Usage
```javascript
// Check if extension is available
if (window.llmControlPanel) {
  const isAvailable = await window.llmControlPanel.isAvailable();
  if (isAvailable) {
    // Generate a response
    const response = await window.llmControlPanel.generateResponse(
      "Hello, how are you?",
      "tinyllama-1.1b-chat"
    );
    console.log(response);
  }
}
```

### Model Management
```javascript
// Load a model
await window.llmControlPanel.loadModel('tinyllama-1.1b-chat');

// Get available models
const models = await window.llmControlPanel.getAvailableModels();

// Unload a model
await window.llmControlPanel.unloadModel('tinyllama-1.1b-chat');
```

### Provider Information
```javascript
// Get available providers
const providers = await window.llmControlPanel.getAvailableProviders();

// Get WebNN devices
const devices = await window.llmControlPanel.getWebNNDevices();
```

### Cache Management
```javascript
// Get cache statistics
const stats = await window.llmControlPanel.getCacheStats();

// Clear all cache
await window.llmControlPanel.clearAllCachedModels();
```

## Migration Guide

### For Existing Users

If you were previously using Chrome extension APIs directly, you can now use the page-level API instead:

**Before:**
```javascript
chrome.runtime.sendMessage({
  type: 'generate-response',
  prompt: 'Hello',
  modelId: 'tinyllama-1.1b-chat'
}, (response) => {
  console.log(response);
});
```

**After:**
```javascript
const response = await window.llmControlPanel.generateResponse(
  'Hello',
  'tinyllama-1.1b-chat'
);
console.log(response);
```

### For New Users

Simply include the extension and use the API:

```javascript
// Wait for the API to be ready
window.addEventListener('llmControlPanelReady', async () => {
  if (await window.llmControlPanel.isAvailable()) {
    // Use the API
    const response = await window.llmControlPanel.generateResponse('Hello');
    console.log(response);
  }
});
```

## Technical Details

### Communication Flow

1. **Page Context** → `window.llmControlPanel.method()` 
2. **API Script** → `window.postMessage()` 
3. **Content Script** → `chrome.runtime.sendMessage()` 
4. **Background Script** → Process request and return response
5. **Content Script** → `window.postMessage()` 
6. **API Script** → Resolve/reject promise
7. **Page Context** → Receive result

### Error Handling

All API methods include comprehensive error handling:
- Timeout protection (30 seconds)
- Network error handling
- Extension availability checking
- Detailed error messages

### Security

The API maintains the same security model as before:
- Only works when the extension is installed and enabled
- No direct access to Chrome extension APIs from page context
- All communication goes through the content script

## Testing

The updated test page (`test-onnx.html`) and new example file (`example-usage.html`) provide comprehensive testing of all API features. You can use these to verify that the new API works correctly.

## Future Enhancements

The new API structure makes it easy to add new features:

1. Add new methods to `window.llmControlPanel`
2. Add corresponding handlers in the content script
3. Add background script handlers if needed
4. Update documentation

This modular approach makes the extension more maintainable and extensible. 