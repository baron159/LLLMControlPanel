export interface ModelConfig {
  modelId: string
  modelName: string
  modelSize: string
  description: string
  url: string
}

import { ThemeManager } from '../../core/utils/theme-manager'

export class SettingsView extends HTMLElement {
  private models: ModelConfig[] = [
    {
      modelId: 'tinyllama-1.1b-chat',
      modelName: 'TinyLlama 1.1B Chat',
      modelSize: '1.1B',
      description: 'Fast, lightweight model for quick responses',
      url: 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0'
    },
    {
      modelId: 'llama-2-7b-chat',
      modelName: 'Llama 2 7B Chat',
      modelSize: '7B',
      description: 'Balanced performance and speed',
      url: 'https://huggingface.co/meta-llama/Llama-2-7b-chat-hf'
    },
    {
      modelId: 'llama-2-13b-chat',
      modelName: 'Llama 2 13B Chat',
      modelSize: '13B',
      description: 'Higher quality responses with more parameters',
      url: 'https://huggingface.co/meta-llama/Llama-2-13b-chat-hf'
    }
  ]
  
  private selectedModel: string = 'tinyllama-1.1b-chat'
  private isModelLoading = false
  private modelProgress = 0
  private currentTheme: 'light' | 'dark' = 'light'
  private themeManager = ThemeManager.getInstance()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.loadSettings()
    this.initializeTheme()
  }

  connectedCallback() {
    this.render()
  }

  private initializeTheme() {
    this.currentTheme = this.themeManager.getTheme()
    console.log('SettingsView: Initial theme:', this.currentTheme)
    this.applyTheme(this.currentTheme)
    
    this.themeManager.addListener((theme) => {
      console.log('SettingsView: Theme changed to:', theme)
      this.currentTheme = theme
      this.applyTheme(theme)
      this.render()
    })
  }

  private applyTheme(theme: 'light' | 'dark') {
    if (!this.shadowRoot) return
    
    if (theme === 'dark') {
      this.shadowRoot.host.classList.add('dark')
    } else {
      this.shadowRoot.host.classList.remove('dark')
    }
  }

  private async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['selectedModel', 'modelProgress'])
      this.selectedModel = result.selectedModel || 'tinyllama-1.1b-chat'
      this.modelProgress = result.modelProgress || 0
      this.render()
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  private render() {
    if (!this.shadowRoot) return

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        
        .dark .section-title {
          color: #e0e0e0;
        }
        
        .model-grid {
          display: grid;
          gap: 12px;
        }
        
        .model-card {
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }
        
        .dark .model-card {
          background: #2d2d2d;
          border-color: #404040;
        }
        
        .model-card:hover {
          border-color: #007AFF;
        }
        
        .model-card.selected {
          border-color: #007AFF;
          background: rgba(0, 122, 255, 0.05);
        }
        
        .dark .model-card.selected {
          background: rgba(0, 122, 255, 0.1);
        }
        
        .model-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .model-name {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        
        .dark .model-name {
          color: #e0e0e0;
        }
        
        .model-size {
          font-size: 12px;
          color: #007AFF;
          background: rgba(0, 122, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .model-description {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
          margin-bottom: 12px;
        }
        
        .dark .model-description {
          color: #ccc;
        }
        
        .model-url {
          font-size: 11px;
          color: #999;
          word-break: break-all;
        }
        
        .dark .model-url {
          color: #888;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        
        .dark .loading-overlay {
          background: rgba(45, 45, 45, 0.9);
        }
        
        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: #007AFF;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
          text-align: center;
        }
        
        .dark .progress-text {
          color: #ccc;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        
        .action-button {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .primary-button {
          background: #007AFF;
          color: white;
        }
        
        .primary-button:hover {
          background: #0056CC;
        }
        
        .primary-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .secondary-button {
          background: #f0f0f0;
          color: #333;
        }
        
        .dark .secondary-button {
          background: #404040;
          color: #e0e0e0;
        }
        
        .secondary-button:hover {
          background: #e0e0e0;
        }
        
        .dark .secondary-button:hover {
          background: #505050;
        }
        
        .status-message {
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-top: 12px;
        }
        
        .status-success {
          background: rgba(52, 199, 89, 0.1);
          color: #34C759;
          border: 1px solid rgba(52, 199, 89, 0.2);
        }
        
        .status-error {
          background: rgba(255, 59, 48, 0.1);
          color: #FF3B30;
          border: 1px solid rgba(255, 59, 48, 0.2);
        }
        
        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .dark .theme-toggle {
          background: #2d2d2d;
          border-color: #404040;
        }
        
        .theme-toggle:hover {
          border-color: #007AFF;
        }
        
        .theme-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .theme-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        
        .dark .theme-label {
          color: #e0e0e0;
        }
        
        .theme-description {
          font-size: 13px;
          color: #666;
        }
        
        .dark .theme-description {
          color: #ccc;
        }
        
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 24px;
          background: #ccc;
          border-radius: 12px;
          transition: background 0.3s ease;
        }
        
        .toggle-switch.active {
          background: #007AFF;
        }
        
        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }
        
        .toggle-switch.active .toggle-slider {
          transform: translateX(26px);
        }
      </style>
      
      <div class="settings-container">
        <div class="settings-section">
          <h3 class="section-title">Appearance</h3>
          <div class="theme-toggle" id="theme-toggle">
            <div class="theme-info">
              <span class="theme-label">Dark Mode</span>
              <span class="theme-description">Switch between light and dark themes</span>
            </div>
            <div class="toggle-switch ${this.currentTheme === 'dark' ? 'active' : ''}" id="toggle-switch">
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3 class="section-title">Model Selection</h3>
          <div class="model-grid">
            ${this.models.map(model => `
              <div class="model-card ${this.selectedModel === model.modelId ? 'selected' : ''}" data-model-id="${model.modelId}">
                <div class="model-header">
                  <span class="model-name">${model.modelName}</span>
                  <span class="model-size">${model.modelSize}</span>
                </div>
                <div class="model-description">${model.description}</div>
                <div class="model-url">${model.url}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="settings-section">
          <h3 class="section-title">Model Status</h3>
          ${this.isModelLoading ? `
            <div class="loading-overlay">
              <div style="text-align: center;">
                <div>Loading model...</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${this.modelProgress}%"></div>
                </div>
                <div class="progress-text">${this.modelProgress}% complete</div>
              </div>
            </div>
          ` : ''}
          
          <div class="action-buttons">
            <button class="action-button secondary-button" id="test-model">
              Test Model
            </button>
            <button class="action-button primary-button" id="load-model" ${this.isModelLoading ? 'disabled' : ''}>
              ${this.modelProgress > 0 ? 'Resume Loading' : 'Load Model'}
            </button>
          </div>
        </div>
      </div>
    `
    
    // Setup event listeners after DOM is created
    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return

    // Theme toggle
    this.shadowRoot.getElementById('theme-toggle')?.addEventListener('click', () => {
      console.log('SettingsView: Theme toggle clicked')
      this.themeManager.toggleTheme()
    })

    // Model selection
    this.shadowRoot.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const modelId = target.dataset.modelId
        if (modelId) {
          this.selectedModel = modelId
          this.saveSettings()
          this.render()
        }
      })
    })

    // Load model
    this.shadowRoot.getElementById('load-model')?.addEventListener('click', () => {
      this.loadModel()
    })

    // Test model
    this.shadowRoot.getElementById('test-model')?.addEventListener('click', () => {
      this.testModel()
    })
  }

  private async saveSettings() {
    try {
      await chrome.storage.local.set({ 
        selectedModel: this.selectedModel,
        modelProgress: this.modelProgress
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  private async loadModel() {
    this.isModelLoading = true
    this.render()

    try {
      // Simulate model loading progress
      for (let i = this.modelProgress; i <= 100; i += 10) {
        this.modelProgress = i
        this.render()
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      this.isModelLoading = false
      this.saveSettings()
      this.render()
      
      // Show success message
      this.showStatus('Model loaded successfully!', 'success')
    } catch (error) {
      this.isModelLoading = false
      this.render()
      this.showStatus('Failed to load model. Please try again.', 'error')
    }
  }

  private async testModel() {
    try {
      // Send test message to background script
      const response = await chrome.runtime.sendMessage({
        type: 'test-model',
        modelId: this.selectedModel,
        message: 'Hello, this is a test message.'
      })
      
      if (response.success) {
        this.showStatus('Model test successful!', 'success')
      } else {
        this.showStatus('Model test failed: ' + response.error, 'error')
      }
    } catch (error) {
      this.showStatus('Model test failed. Please try again.', 'error')
    }
  }

  private showStatus(message: string, type: 'success' | 'error') {
    if (!this.shadowRoot) return

    const statusDiv = document.createElement('div')
    statusDiv.className = `status-message status-${type}`
    statusDiv.textContent = message
    
    const container = this.shadowRoot.querySelector('.settings-container')
    if (container) {
      container.appendChild(statusDiv)
      
      // Remove status after 3 seconds
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.parentNode.removeChild(statusDiv)
        }
      }, 3000)
    }
  }
}

customElements.define('settings-view', SettingsView) 