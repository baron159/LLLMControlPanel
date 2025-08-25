import { ThemeManager } from '../../core/utils/theme-manager'

export class SettingsView extends HTMLElement {
  private currentTheme: 'light' | 'dark' = 'light'
  private themeManager = ThemeManager.getInstance()
  private availableProviders: string[] = []
  private deviceMemoryGB: number | undefined = (navigator as any).deviceMemory
  private quantRecommendation: { level: string; reason: string } | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.initializeTheme()
    this.fetchSystemStatus()
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

  // Removed legacy model settings handling

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

        .provider-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .provider-chip {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 16px;
          border: 1px solid #e0e0e0;
          background: white;
          color: #333;
        }

        .dark .provider-chip {
          background: #2d2d2d;
          border-color: #404040;
          color: #e0e0e0;
        }

        .subtext {
          font-size: 12px;
          color: #666;
        }

        .dark .subtext { color: #bbb; }

        .quant-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          background: rgba(0, 122, 255, 0.1);
          color: #007AFF;
        }

        .row-actions { display:flex; gap:8px; }
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
          <h3 class="section-title">Execution Providers</h3>
          <div class="provider-list">
            ${this.availableProviders.length > 0 ? this.availableProviders.map(p => `
              <span class="provider-chip">${p.toUpperCase()}</span>
            `).join('') : '<span class="subtext">Detecting providers...</span>'}
          </div>
          <div class="row-actions">
            <button class="action-button secondary-button" id="refresh-providers">Refresh</button>
          </div>
          <div class="subtext">${this.deviceMemoryGB ? `${this.deviceMemoryGB} GB memory detected` : 'Memory info unavailable'}</div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">Recommended Quantization</h3>
          ${this.quantRecommendation ? `
            <div>
              <span class="quant-badge">${this.quantRecommendation.level}</span>
            </div>
            <div class="subtext" style="margin-top:6px;">${this.quantRecommendation.reason}</div>
          ` : '<span class="subtext">Calculating recommendation...</span>'}
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

    // Refresh providers
    this.shadowRoot.getElementById('refresh-providers')?.addEventListener('click', async () => {
      await this.fetchSystemStatus()
    })
  }

  // legacy no-ops removed

  private async fetchSystemStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'status' })
      if (response && response.success && response.data) {
        const data = response.data as { availableProviders: string[] }
        this.availableProviders = data.availableProviders || []
        this.quantRecommendation = this.computeQuantizationRecommendation(this.availableProviders, this.deviceMemoryGB)
        this.render()
      }
    } catch (e) {
      // ignore
    }
  }

  private computeQuantizationRecommendation(providers: string[], deviceMemoryGB?: number): { level: string; reason: string } {
    const mem = typeof deviceMemoryGB === 'number' ? deviceMemoryGB : undefined
    const hasWebGPU = providers.includes('webgpu')
    const hasWebNN = providers.includes('webnn')
    const hasWASM = providers.includes('wasm') || providers.length === 0

    if (hasWebGPU) {
      if (mem && mem >= 16) return { level: 'fp16', reason: 'WebGPU + ample memory: best speed/quality balance' }
      if (mem && mem >= 8) return { level: 'q4f16', reason: 'WebGPU + moderate memory: quantized weights with FP16 activations' }
      return { level: 'q4', reason: 'WebGPU but low memory: prioritize smallest footprint' }
    }

    if (hasWebNN) {
      if (mem && mem >= 8) return { level: 'q4f16', reason: 'WebNN device available: hybrid quantization recommended' }
      return { level: 'q4', reason: 'WebNN with constrained memory: prefer 4-bit weights' }
    }

    if (hasWASM) {
      if (mem && mem >= 8) return { level: 'q4f16', reason: 'WASM only: quantization helps; FP16 activations if memory allows' }
      return { level: 'q4', reason: 'WASM only and limited memory: smallest weights recommended' }
    }

    return { level: 'q4', reason: 'Default recommendation when environment is unknown' }
  }
}

customElements.define('settings-view', SettingsView)