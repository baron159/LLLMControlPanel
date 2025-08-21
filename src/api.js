// API script that runs in the page context
(function() {
  'use strict';
  
  // Create the API object
  window.llmCtl = {
    async generateResponse(prompt, modelId) {
      return this.sendRequest('generate-response', { prompt, modelId });
    },
    
    async testModel(modelId, message) {
      return this.sendRequest('test-model', { modelId, message });
    },

    async loadModel(modelId, useWorker = false) {
      return this.sendRequest('load-model', { modelId, useWorker });
    },

    async unloadModel(modelId, useWorker = false) {
      return this.sendRequest('unload-model', { modelId, useWorker });
    },

    async getAvailableModels() {
      return this.sendRequest('get-available-models');
    },

    async getAvailableProviders() {
      return this.sendRequest('get-available-providers');
    },

    async getWebNNDevices() {
      return this.sendRequest('get-webnn-devices');
    },

    async getPreferredWebNNDevice() {
      return this.sendRequest('get-preferred-webnn-device');
    },

    async getCacheStats() {
      return this.sendRequest('get-cache-stats');
    },

    async getCachedModels() {
      return this.sendRequest('get-cached-models');
    },

    async clearAllCachedModels() {
      return this.sendRequest('clear-all-cached-models');
    },

    async cleanupOldCachedModels(maxAge) {
      return this.sendRequest('cleanup-old-cached-models', { maxAge });
    },

    // Generic request method
    async sendRequest(action, data = {}) {
      return new Promise((resolve, reject) => {
        const id = Date.now() + Math.random();
        
        // Listen for response
        const listener = (event) => {
          if (event.data.type === 'llm-control-panel-response' && 
              event.data.id === id) {
            window.removeEventListener('message', listener);
            if (event.data.success) {
              resolve(event.data.response);
            } else {
              reject(new Error(event.data.error));
            }
          }
        };
        
        window.addEventListener('message', listener);
        
        // Send request
        window.postMessage({
          type: 'llm-control-panel-request',
          action: action,
          data: data,
          id: id
        }, '*');
        
        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', listener);
          reject(new Error('Request timeout'));
        }, 30000);
      });
    },

    // Check if extension is available
    async isAvailable() {
      try {
        await this.sendRequest('ping');
        return true;
      } catch (error) {
        return false;
      }
    },

    // Request approval for 3rd party app access
    async requestApproval(appInfo) {
      if (!appInfo || !appInfo.name || !appInfo.origin) {
        throw new Error('App info with name and origin is required');
      }
      
      // Set default permissions if not provided
      const defaultPermissions = ['model-access', 'generate-response'];
      const requestedPermissions = appInfo.requestedPermissions || defaultPermissions;
      
      const fullAppInfo = {
        name: appInfo.name,
        origin: appInfo.origin || window.location.origin,
        description: appInfo.description || `Access request from ${appInfo.name}`,
        requestedPermissions
      };
      
      return this.sendRequest('approval-request', { appInfo: fullAppInfo });
    },

    // Check if current app is approved
    async checkApprovalStatus() {
      const origin = window.location.origin;
      return this.sendRequest('check-app-approval', { origin });
    }
  };
  
  // Dispatch event when the API is ready
  window.dispatchEvent(new CustomEvent('llmControlPanelReady'));
})();