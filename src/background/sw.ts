/**
 * Service Worker for LLM Control Panel Extension
 * Manages model configurations, downloads, and state
 */

import { ModelConfig, ModelDataList, OnnxModelConfigFill } from '../core/utils/model.list';
import { WebNNUtils } from '../core/utils/webnn-utils';

interface ApprovedApp {
  id: string;
  name: string;
  origin: string;
  description?: string;
  approvedAt: number;
  permissions: string[];
}

interface ApprovalRequest {
  id: string;
  appInfo: {
    name: string;
    origin: string;
    description?: string;
    requestedPermissions: string[];
  };
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ServiceWorkerState {
  modelList: ModelDataList;
  currentSelectedModel: string | null;
  availableProviders: string[];
  webnnDevices: any[];
  preferredDevice: any;
  approvedApps: Map<string, ApprovedApp>;
  approvedModelConfigs: Map<string, ModelConfig>;
  pendingApprovalRequests: Map<string, ApprovalRequest>;
}

class LLMServiceWorker {
  private state: ServiceWorkerState;
  private webnnUtils: WebNNUtils;
  private initialized = false;

  constructor() {
    this.webnnUtils = WebNNUtils.getInstance();
    this.state = {
      modelList: new ModelDataList([]),
      currentSelectedModel: null,
      availableProviders: [],
      webnnDevices: [],
      preferredDevice: null,
      approvedApps: new Map<string, ApprovedApp>(),
      approvedModelConfigs: new Map<string, ModelConfig>(),
      pendingApprovalRequests: new Map<string, ApprovalRequest>()
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing LLM Service Worker...');
      
      // Initialize WebNN utilities
      await this.webnnUtils.initialize();
      
      // Get available providers and devices
      this.state.availableProviders = this.getAvailableProviders();
      this.state.webnnDevices = this.webnnUtils.getAvailableDevices();
      this.state.preferredDevice = this.webnnUtils.getPreferredDevice();
      
      // Load existing model configurations from storage
      await this.loadModelConfigsFromStorage();
      
      // Check which models are already downloaded
      await this.checkDownloadedModels();
      
      this.initialized = true;
      console.log('LLM Service Worker initialized successfully');
      console.log('Available providers:', this.state.availableProviders);
      console.log('WebNN devices:', this.state.webnnDevices);
      console.log('Current models:', this.state.modelList.currentModelList);
      
    } catch (error) {
      console.error('Failed to initialize LLM Service Worker:', error);
      this.initialized = true; // Set to true to prevent infinite retry
    }
  }

  private getAvailableProviders(): string[] {
    const providers = ['wasm']; // WASM is always available
    
    // Check for WebGPU support
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      providers.push('webgpu');
    }
    
    // Check for WebNN support
    if (this.webnnUtils.isWebNNAvailable()) {
      providers.push('webnn');
    }
    
    return providers;
  }

  private async loadModelConfigsFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        'modelConfigs', 
        'selectedModel', 
        'approvedApps', 
        'approvedModelConfigs'
      ]);
      
      if (result.modelConfigs && Array.isArray(result.modelConfigs)) {
        this.state.modelList = new ModelDataList(result.modelConfigs);
      }
      
      if (result.selectedModel && typeof result.selectedModel === 'string') {
        this.state.currentSelectedModel = result.selectedModel;
      }
      
      // Load approved apps
      if (result.approvedApps && Array.isArray(result.approvedApps)) {
        this.state.approvedApps = new Map(result.approvedApps.map((app: ApprovedApp) => [app.id, app]));
      }
      
      // Load approved model configs
      if (result.approvedModelConfigs && Array.isArray(result.approvedModelConfigs)) {
        this.state.approvedModelConfigs = new Map(result.approvedModelConfigs.map((config: ModelConfig) => [config.modelId, config]));
      }
      
    } catch (error) {
      console.error('Failed to load model configs from storage:', error);
    }
  }

  private async saveModelConfigsToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({
        modelConfigs: this.state.modelList.currentModelList.map(id => 
          this.state.modelList.getModelConfig(id)
        ).filter(Boolean),
        selectedModel: this.state.currentSelectedModel,
        approvedApps: Array.from(this.state.approvedApps.values()),
        approvedModelConfigs: Array.from(this.state.approvedModelConfigs.values())
      });
    } catch (error) {
      console.error('Failed to save model configs to storage:', error);
    }
  }

  private async checkDownloadedModels(): Promise<void> {
    try {
      // Check IndexedDB for downloaded models
      const db = await this.openModelDatabase();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        const downloadedModelIds = request.result as string[];
        console.log('Downloaded models found:', downloadedModelIds);
        
        // Update model configs to reflect download status
        for (const modelId of this.state.modelList.currentModelList) {
          const config = this.state.modelList.getModelConfig(modelId);
          if (config) {
            // Mark as downloaded if found in IndexedDB
            (config as any).isDownloaded = downloadedModelIds.includes(modelId);
          }
        }
      };
      
      db.close();
    } catch (error) {
      console.error('Failed to check downloaded models:', error);
    }
  }

  private async openModelDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('llm-models', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'modelId' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks');
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async handleAddModel(modelConfig: ModelConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Validate model config
      if (!modelConfig.modelId || typeof modelConfig.modelId !== 'string') {
        return { success: false, message: 'Invalid model ID' };
      }
      
      // Check if model already exists
      if (this.state.modelList.getModelConfig(modelConfig.modelId)) {
        return { success: false, message: 'Model already exists' };
      }
      
      // Add model to list
      const added = this.state.modelList.addModel(modelConfig.modelId, modelConfig);
      // Also add to approved model configs
      this.state.approvedModelConfigs.set(added.modelId, added);
      
      // Save to storage
      await this.saveModelConfigsToStorage();
      
      console.log(`Model ${modelConfig.modelId} added successfully`);
      return { success: true, message: 'Model added successfully' };
      
    } catch (error) {
      console.error('Failed to add model:', error);
      return { success: false, message: `Failed to add model: ${error}` };
    }
  }

  async handleUpdateModel(modelConfig: ModelConfig): Promise<{ success: boolean; message: string }> {
    try {
      if (!modelConfig.modelId || typeof modelConfig.modelId !== 'string') {
        return { success: false, message: 'Invalid model ID' };
      }
      const existing = this.state.modelList.getModelConfig(modelConfig.modelId);
      const wasDownloaded = existing ? (existing as any).isDownloaded === true : false;

      // Overwrite existing config (using addModel to normalize defaults)
      const updated = this.state.modelList.addModel(modelConfig.modelId, modelConfig);
      if (wasDownloaded) (updated as any).isDownloaded = true;

      // Keep approved list in sync
      this.state.approvedModelConfigs.set(updated.modelId, updated);

      await this.saveModelConfigsToStorage();
      return { success: true, message: 'Model updated successfully' };
    } catch (error) {
      console.error('Failed to update model:', error);
      return { success: false, message: `Failed to update model: ${error}` };
    }
  }

  async handleDownloadModel(modelId: string): Promise<{ success: boolean; message: string; progress?: number }> {
    try {
      // Check if model exists in config
      const config = this.state.modelList.getModelConfig(modelId);
      if (!config) {
        return { success: false, message: 'Model not found in configuration' };
      }
      
      // Check if already downloaded
      if ((config as any).isDownloaded) {
        return { success: true, message: 'Model already downloaded' };
      }
      
      console.log(`Starting download for model: ${modelId}`);
      
      // Use the existing model loading functionality
      await this.state.modelList.loadModel(modelId);
      
      // Check if model data was successfully stored
      const { hasModelData } = await import('../core/utils/fetchchunkstore');
      const modelExists = await hasModelData(modelId);
      
      if (modelExists) {
        // Mark as downloaded
        (config as any).isDownloaded = true;
        await this.saveModelConfigsToStorage();
        
        console.log(`Model ${modelId} downloaded successfully`);
        return { success: true, message: 'Model downloaded successfully' };
      } else {
        return { success: false, message: 'Failed to download model data' };
      }
      
    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error);
      return { success: false, message: `Download failed: ${error}` };
    }
  }

  getStatus(): {
    modelIds: string[];
    currentSelectedModel: string | null;
    availableProviders: string[];
    webnnDevices: any[];
    preferredDevice: any;
    downloadedModels: string[];
  } {
    const downloadedModels = this.state.modelList.currentModelList.filter(modelId => {
      const config = this.state.modelList.getModelConfig(modelId);
      return config && (config as any).isDownloaded;
    });
    
    return {
      modelIds: this.state.modelList.currentModelList,
      currentSelectedModel: this.state.currentSelectedModel,
      availableProviders: this.state.availableProviders,
      webnnDevices: this.state.webnnDevices,
      preferredDevice: this.state.preferredDevice,
      downloadedModels
    };
  }

  async setSelectedModel(modelId: string): Promise<{ success: boolean; message: string }> {
    try {
      const config = this.state.modelList.getModelConfig(modelId);
      if (!config) {
        return { success: false, message: 'Model not found' };
      }
      
      this.state.currentSelectedModel = modelId;
      await this.saveModelConfigsToStorage();
      
      console.log(`Selected model changed to: ${modelId}`);
      return { success: true, message: 'Model selected successfully' };
      
    } catch (error) {
      console.error('Failed to set selected model:', error);
      return { success: false, message: `Failed to select model: ${error}` };
    }
  }

  async handleApprovalRequest(appInfo: {
    name: string;
    origin: string;
    description?: string;
    requestedPermissions: string[];
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const approvalRequest: ApprovalRequest = {
        id: requestId,
        appInfo,
        requestedAt: Date.now(),
        status: 'pending'
      };
      
      this.state.pendingApprovalRequests.set(requestId, approvalRequest);
      
      // Trigger popup to show approval request
      await this.showApprovalPopup(requestId);
      
      console.log(`Approval request created: ${requestId} for app: ${appInfo.name}`);
      return { success: true, message: 'Approval request created', requestId };
      
    } catch (error) {
      console.error('Failed to handle approval request:', error);
      return { success: false, message: `Failed to create approval request: ${error}` };
    }
  }

  private async showApprovalPopup(requestId: string): Promise<void> {
    try {
      // Store the approval request for the popup to pick up
      const request = this.state.pendingApprovalRequests.get(requestId);
      if (request) {
        // Store in chrome.storage.local for popup to access
        await chrome.storage.local.set({
          pendingApprovalRequest: {
            requestId,
            appInfo: request.appInfo,
            timestamp: Date.now()
          }
        });
        
        // Create a new tab with the popup URL and approval parameter
        await chrome.tabs.create({
          url: chrome.runtime.getURL('src/popup/index.html?approval=true'),
          active: true
        });
      }
    } catch (error) {
      console.error('Failed to show approval popup:', error);
    }
  }

  async handleApprovalResponse(requestId: string, approved: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const request = this.state.pendingApprovalRequests.get(requestId);
      if (!request) {
        return { success: false, message: 'Approval request not found' };
      }
      
      if (approved) {
        // Create approved app entry
        const approvedApp: ApprovedApp = {
          id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: request.appInfo.name,
          origin: request.appInfo.origin,
          description: request.appInfo.description,
          approvedAt: Date.now(),
          permissions: request.appInfo.requestedPermissions
        };
        
        this.state.approvedApps.set(approvedApp.id, approvedApp);
        request.status = 'approved';
        
        console.log(`App approved: ${approvedApp.name} (${approvedApp.origin})`);
      } else {
        request.status = 'rejected';
        console.log(`App rejected: ${request.appInfo.name} (${request.appInfo.origin})`);
      }
      
      // Remove from pending requests
      this.state.pendingApprovalRequests.delete(requestId);
      
      // Save to storage
      await this.saveModelConfigsToStorage();
      
      return { 
        success: true, 
        message: approved ? 'App approved successfully' : 'App rejected successfully' 
      };
      
    } catch (error) {
      console.error('Failed to handle approval response:', error);
      return { success: false, message: `Failed to process approval: ${error}` };
    }
  }

  isAppApproved(origin: string): boolean {
    console.log('Checking approval for origin:', origin);
    console.log('current state:', this.state.approvedApps);
    return Array.from(this.state.approvedApps.values()).some(app => app.origin === origin);
  }

  getApprovedApps(): ApprovedApp[] {
    return Array.from(this.state.approvedApps.values());
  }

  async refreshApprovedApps(): Promise<ApprovedApp[]> {
    try {
      await this.loadModelConfigsFromStorage();
      return this.getApprovedApps();
    } catch (error) {
      console.error('Failed to refresh approved apps:', error);
      return this.getApprovedApps();
    }
  }

  async revokeAppApproval(appId: string): Promise<{ success: boolean; message: string }> {
    try {
      const app = this.state.approvedApps.get(appId);
      if (!app) {
        return { success: false, message: 'App not found' };
      }
      
      this.state.approvedApps.delete(appId);
      await this.saveModelConfigsToStorage();
      
      console.log(`App approval revoked: ${app.name} (${app.origin})`);
      return { success: true, message: 'App approval revoked successfully' };
      
    } catch (error) {
      console.error('Failed to revoke app approval:', error);
      return { success: false, message: `Failed to revoke approval: ${error}` };
    }
  }
}

// Global service worker instance
const llmServiceWorker = new LLMServiceWorker();

// Initialize when service worker starts
llmServiceWorker.initialize();

// Message listener for communication with other parts of the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Service worker received message:', message);
  
  const handleAsync = async () => {
    try {
      switch (message.type) {
        case 'addModel':
          if (!message.modelConfig) {
            return { success: false, message: 'Model config is required' };
          }
          return await llmServiceWorker.handleAddModel(message.modelConfig);
        
        case 'updateModel':
          if (!message.modelConfig) {
            return { success: false, message: 'Model config is required' };
          }
          return await llmServiceWorker.handleUpdateModel(message.modelConfig);
          
        case 'downloadModel':
          if (!message.modelId) {
            return { success: false, message: 'Model ID is required' };
          }
          return await llmServiceWorker.handleDownloadModel(message.modelId);
          
        case 'status':
          return {
            success: true,
            data: llmServiceWorker.getStatus()
          };
          
        case 'setSelectedModel':
          if (!message.modelId) {
            return { success: false, message: 'Model ID is required' };
          }
          return await llmServiceWorker.setSelectedModel(message.modelId);
          
        case 'approvalRequest':
          if (!message.appInfo) {
            return { success: false, message: 'App info is required' };
          }
          return await llmServiceWorker.handleApprovalRequest(message.appInfo);
          
        case 'approvalResponse':
          if (!message.requestId || typeof message.approved !== 'boolean') {
            return { success: false, message: 'Request ID and approval status are required' };
          }
          return await llmServiceWorker.handleApprovalResponse(message.requestId, message.approved);
          
        case 'getApprovedApps':
          return {
            success: true,
            data: llmServiceWorker.getApprovedApps()
          };
        
        case 'refreshApprovedApps':
          return {
            success: true,
            data: await llmServiceWorker.refreshApprovedApps()
          };
          
        case 'revokeAppApproval':
          if (!message.appId) {
            return { success: false, message: 'App ID is required' };
          }
          return await llmServiceWorker.revokeAppApproval(message.appId);
          
        case 'checkAppApproval':
          if (!message.origin) {
            return { success: false, message: 'Origin is required' };
          }
          return {
            success: true,
            data: { approved: llmServiceWorker.isAppApproved(message.origin) }
          };
          
        default:
          return { success: false, message: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { success: false, message: `Error: ${error}` };
    }
  };
  
  // Handle async operations
  handleAsync().then(sendResponse);
  return true; // Keep message channel open for async response
});

// Handle extension installation/startup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('LLM Control Panel Extension sw installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Add some default models on first install
    const defaultModels = [
      OnnxModelConfigFill('microsoft/DialoGPT-medium'),
      OnnxModelConfigFill('Xenova/TinyLlama-1.1B-Chat-v1.0'),
    ];
    
    defaultModels.forEach(async (config) => {
      await llmServiceWorker.handleAddModel(config);
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  llmServiceWorker.initialize();
});

// Export for potential use in other contexts
export { llmServiceWorker };