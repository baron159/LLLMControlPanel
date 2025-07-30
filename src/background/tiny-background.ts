// Background script with actual ONNX integration
import { ModelManager } from '../core/managers/model-manager'
import { LightweightModelManager } from '../core/managers/lightweight-model-manager'

console.log('LLM Control Panel background script loaded')

// Initialize model managers with error handling
let modelManager: ModelManager
let lightweightModelManager: LightweightModelManager

try {
  modelManager = new ModelManager()
  lightweightModelManager = new LightweightModelManager()
  console.log('Model managers initialized successfully')
} catch (error) {
  console.error('Failed to initialize model managers:', error)
  throw error
}

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
  
  if (message.type === 'unload-model') {
    handleUnloadModel(message, sendResponse)
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
  
  if (message.type === 'get-webnn-devices') {
    handleGetWebNNDevices(message, sendResponse)
    return true
  }
  
  if (message.type === 'get-preferred-webnn-device') {
    handleGetPreferredWebNNDevice(message, sendResponse)
    return true
  }
})

async function handleTestModel(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId, message: testMessage } = message
    const response = await modelManager.generateResponse(testMessage || 'Hello', modelId)
    sendResponse({ 
      success: true, 
      response 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGenerateResponse(message: any, sendResponse: (response: any) => void) {
  try {
    const { prompt, modelId } = message
    const response = await modelManager.generateResponse(prompt, modelId)
    sendResponse({ 
      success: true, 
      response 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleLoadModel(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId, useWorker = false } = message
    const manager = useWorker ? lightweightModelManager : modelManager
    const success = await manager.loadModel(modelId)
    sendResponse({ success })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleUnloadModel(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId, useWorker = false } = message
    const manager = useWorker ? lightweightModelManager : modelManager
    await manager.unloadModel(modelId)
    sendResponse({ success: true })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetModelStatus(message: any, sendResponse: (response: any) => void) {
  try {
    const { modelId, useWorker = false } = message
    const manager = useWorker ? lightweightModelManager : modelManager
    const status = manager.getModelStatus(modelId)
    sendResponse({ 
      success: true, 
      status 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetAvailableModels(_message: any, sendResponse: (response: any) => void) {
  try {
    const models = modelManager.getAvailableModels()
    sendResponse({ 
      success: true, 
      models 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetAvailableProviders(_message: any, sendResponse: (response: any) => void) {
  try {
    const providers = modelManager.getAvailableProviders()
    sendResponse({ 
      success: true, 
      providers 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetCacheStats(_message: any, sendResponse: (response: any) => void) {
  try {
    const stats = await modelManager.getCacheStats()
    sendResponse({ 
      success: true, 
      stats 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetCachedModels(_message: any, sendResponse: (response: any) => void) {
  try {
    const models = await modelManager.getCachedModels()
    sendResponse({ 
      success: true, 
      models 
    })
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

async function handleGetWebNNDevices(_message: any, sendResponse: (response: any) => void) {
  try {
    const devices = modelManager.getWebNNDevices()
    sendResponse({ 
      success: true, 
      devices 
    })
  } catch (error: any) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleGetPreferredWebNNDevice(_message: any, sendResponse: (response: any) => void) {
  try {
    const device = modelManager.getPreferredWebNNDevice()
    sendResponse({ 
      success: true, 
      device 
    })
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