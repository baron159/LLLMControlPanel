// API script that runs in the page context
(function() {
  'use strict';
  
  // Create the API object
  window.llmControlPanel = {
    async generateResponse(prompt, modelId) {
      return new Promise((resolve, reject) => {
        // Use postMessage to communicate with the content script
        window.postMessage({
          type: 'llm-control-panel-request',
          action: 'generate-response',
          data: { prompt, modelId },
          id: Date.now() + Math.random()
        }, '*')
        
        // Listen for response
        const listener = (event) => {
          if (event.data.type === 'llm-control-panel-response' && 
              event.data.id === this.id) {
            window.removeEventListener('message', listener)
            if (event.data.success) {
              resolve(event.data.response)
            } else {
              reject(new Error(event.data.error))
            }
          }
        }
        window.addEventListener('message', listener)
      })
    },
    
    async testModel(modelId, message) {
      return new Promise((resolve, reject) => {
        // Use postMessage to communicate with the content script
        window.postMessage({
          type: 'llm-control-panel-request',
          action: 'test-model',
          data: { modelId, message },
          id: Date.now() + Math.random()
        }, '*')
        
        // Listen for response
        const listener = (event) => {
          if (event.data.type === 'llm-control-panel-response' && 
              event.data.id === this.id) {
            window.removeEventListener('message', listener)
            if (event.data.success) {
              resolve(event.data.response)
            } else {
              reject(new Error(event.data.error))
            }
          }
        }
        window.addEventListener('message', listener)
      })
    }
  }
  
  // Dispatch event when the API is ready
  window.dispatchEvent(new CustomEvent('llmControlPanelReady'))
})() 