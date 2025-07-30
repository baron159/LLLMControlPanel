// Tiny background script - absolutely minimal
console.log('LLM Control Panel tiny background script loaded')

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.type === 'test-model') {
    handleTestModel(message, sendResponse)
    return true // Keep message channel open for async response
  }
  
  if (message.type === 'generate-response') {
    handleGenerateResponse(message, sendResponse)
    return true
  }
  
  if (message.type === 'load-model') {
    handleLoadModel(message, sendResponse)
    return true
  }
  
  if (message.type === 'get-model-status') {
    handleGetModelStatus(message, sendResponse)
    return true
  }
  
  if (message.type === 'get-available-models') {
    handleGetAvailableModels(message, sendResponse)
    return true
  }
  
  if (message.type === 'get-available-providers') {
    handleGetAvailableProviders(message, sendResponse)
    return true
  }
  
  if (message.type === 'get-cache-stats') {
    handleGetCacheStats(message, sendResponse)
    return true
  }
  
  if (message.type === 'get-cached-models') {
    handleGetCachedModels(message, sendResponse)
    return true
  }
  
  if (message.type === 'remove-cached-model') {
    handleRemoveCachedModel(message, sendResponse)
    return true
  }
  
  if (message.type === 'clear-all-cached-models') {
    handleClearAllCachedModels(message, sendResponse)
    return true
  }
  
  if (message.type === 'cleanup-old-cached-models') {
    handleCleanupOldCachedModels(message, sendResponse)
    return true
  }
})

async function handleTestModel(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return a simple response for now
    sendResponse({ 
      success: true, 
      response: 'This is a test response from the tiny background script. ONNX functionality will be loaded on demand.' 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGenerateResponse(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return a simple response for now
    sendResponse({ 
      success: true, 
      response: 'This is a generated response from the tiny background script. ONNX functionality will be loaded on demand.' 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleLoadModel(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return success for now
    sendResponse({ success: true })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetModelStatus(message: any, sendResponse: (response: any) => void) {
  try {
    // Return a mock status
    sendResponse({ 
      success: true, 
      status: { 
        modelId: message.modelId, 
        isLoaded: false, 
        provider: null, 
        loadingProgress: 0 
      } 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetAvailableModels(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return mock models
    sendResponse({ 
      success: true, 
      models: [
        { id: 'tinyllama-1.1b-chat', name: 'TinyLlama 1.1B Chat', description: 'A small, fast language model' },
        { id: 'llama-2-7b-chat', name: 'Llama 2 7B Chat', description: 'Medium-sized language model' },
        { id: 'gpt-2-small', name: 'GPT-2 Small', description: 'Small GPT-2 model' }
      ] 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetAvailableProviders(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return mock providers
    sendResponse({ 
      success: true, 
      providers: ['wasm', 'webgpu', 'webnn'] 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetCacheStats(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return mock stats
    sendResponse({ 
      success: true, 
      stats: { totalSize: 0, modelCount: 0, availableSpace: 5242880 } 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetCachedModels(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return empty cached models
    sendResponse({ success: true, models: [] })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleRemoveCachedModel(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return success
    sendResponse({ success: true })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleClearAllCachedModels(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return success
    sendResponse({ success: true })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleCleanupOldCachedModels(_message: any, sendResponse: (response: any) => void) {
  try {
    // Return success
    sendResponse({ success: true, removedCount: 0 })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details: any) => {
  if (details.reason === 'install') {
    console.log('LLM Control Panel extension installed')
    
    // Initialize default settings
    chrome.storage.local.set({
      selectedModel: 'tinyllama-1.1b-chat',
      modelProgress: 0,
      apps: [],
      activities: []
    })
  }
})

// Handle storage changes
chrome.storage.onChanged.addListener((changes: any, namespace: string) => {
  if (namespace === 'local') {
    console.log('Storage changed:', changes)
  }
}) 