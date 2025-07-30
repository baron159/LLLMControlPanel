// Content script for LLM Control Panel extension

console.log('LLM Control Panel content script loaded')

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'get-page-info') {
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    }
    sendResponse(pageInfo)
  }
})

// Inject the API script into the page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('api.js')
document.head.appendChild(script)

// Listen for messages from the page context
window.addEventListener('message', async (event) => {
  if (event.data.type === 'llm-control-panel-request') {
    try {
      let response
      const { action, data, id } = event.data
      
      // Handle different actions
      switch (action) {
        case 'ping':
          response = { success: true }
          break
          
        case 'generate-response':
          const { prompt, modelId } = data
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'generate-response',
              prompt,
              modelId
            }, (response) => {
              if (response.success) {
                resolve(response.response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'test-model':
          const { modelId: testModelId, message } = data
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'test-model',
              modelId: testModelId,
              message
            }, (response) => {
              if (response.success) {
                resolve(response.response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'load-model':
          const { modelId: loadModelId, useWorker } = data
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'load-model',
              modelId: loadModelId,
              useWorker
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'unload-model':
          const { modelId: unloadModelId, useWorker: unloadUseWorker } = data
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'unload-model',
              modelId: unloadModelId,
              useWorker: unloadUseWorker
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'get-available-models':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'get-available-models'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'get-available-providers':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'get-available-providers'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'get-webnn-devices':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'get-webnn-devices'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'get-preferred-webnn-device':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'get-preferred-webnn-device'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'get-cache-stats':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'get-cache-stats'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'get-cached-models':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'get-cached-models'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'clear-all-cached-models':
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'clear-all-cached-models'
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        case 'cleanup-old-cached-models':
          const { maxAge } = data
          response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'cleanup-old-cached-models',
              maxAge
            }, (response) => {
              if (response.success) {
                resolve(response)
              } else {
                reject(new Error(response.error))
              }
            })
          })
          break
          
        default:
          throw new Error(`Unknown action: ${action}`)
      }
      
      // Send response back to page context
      window.postMessage({
        type: 'llm-control-panel-response',
        id: id,
        success: true,
        response
      }, '*')
    } catch (error: any) {
      // Send error back to page context
      window.postMessage({
        type: 'llm-control-panel-response',
        id: event.data.id,
        success: false,
        error: error.message
      }, '*')
    }
  }
})

// Clean up when script is removed
document.addEventListener('DOMContentLoaded', () => {
  console.log('LLM Control Panel content script initialized')
}) 