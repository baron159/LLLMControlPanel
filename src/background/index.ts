import { ModelManager } from '../core/managers/model-manager'

const modelManager = new ModelManager()

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

async function handleTestModel(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId, message: testMessage } = message
    
    // Load model if not already loaded
    const status = modelManager.getModelStatus(modelId)
    if (!status?.isLoaded) {
      const loaded = await modelManager.loadModel(modelId)
      if (!loaded) {
        sendResponse({ success: false, error: 'Failed to load model' })
        return
      }
    }
    
    // Generate test response
    const response = await modelManager.generateResponse(testMessage)
    sendResponse({ success: true, response })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGenerateResponse(message: any, sendResponse: (response: any) => void) {
  try {
    const { prompt, modelId } = message
    
    // Load model if specified and different from current
    if (modelId && modelId !== modelManager.getCurrentModel()) {
      const loaded = await modelManager.loadModel(modelId)
      if (!loaded) {
        sendResponse({ success: false, error: 'Failed to load model' })
        return
      }
    }
    
    // Generate response
    const response = await modelManager.generateResponse(prompt)
    sendResponse({ success: true, response })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleLoadModel(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId } = message
    const loaded = await modelManager.loadModel(modelId)
    sendResponse({ success: loaded })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetModelStatus(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId } = message
    const status = modelManager.getModelStatus(modelId)
    sendResponse({ success: true, status })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetAvailableModels(_message: any, sendResponse: (response: any) => void) {
  try {
    const models = modelManager.getAvailableModels()
    sendResponse({ success: true, models })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetAvailableProviders(_message: any, sendResponse: (response: any) => void) {
  try {
    const providers = modelManager.getAvailableProviders()
    sendResponse({ success: true, providers })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetCacheStats(_message: any, sendResponse: (response: any) => void) {
  try {
    const stats = await modelManager.getCacheStats()
    sendResponse({ success: true, stats })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetCachedModels(_message: any, sendResponse: (response: any) => void) {
  try {
    const models = await modelManager.getCachedModels()
    sendResponse({ success: true, models })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleRemoveCachedModel(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId } = message
    const success = await modelManager.removeCachedModel(modelId)
    sendResponse({ success })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleClearAllCachedModels(_message: any, sendResponse: (response: any) => void) {
  try {
    const success = await modelManager.clearAllCachedModels()
    sendResponse({ success })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleCleanupOldCachedModels(message: any, sendResponse: (response: any) => void) {
  try {
    const { maxAge } = message
    const removedCount = await modelManager.cleanupOldCachedModels(maxAge)
    sendResponse({ success: true, removedCount })
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

console.log('LLM Control Panel background script loaded') 