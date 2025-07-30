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
      if (event.data.action === 'generate-response') {
        const { prompt, modelId } = event.data.data
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
      } else if (event.data.action === 'test-model') {
        const { modelId, message } = event.data.data
        response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'test-model',
            modelId,
            message
          }, (response) => {
            if (response.success) {
              resolve(response.response)
            } else {
              reject(new Error(response.error))
            }
          })
        })
      }
      
      // Send response back to page context
      window.postMessage({
        type: 'llm-control-panel-response',
        id: event.data.id,
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