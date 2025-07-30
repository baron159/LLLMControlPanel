import type { App } from './apps-view'

export class AppItem extends HTMLElement {
  private app: App | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    const appData = this.getAttribute('app')
    if (appData) {
      this.app = JSON.parse(appData)
    }
    this.render()
    this.setupEventListeners()
  }

  private render() {
    if (!this.shadowRoot || !this.app) return

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }
        
        .modal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .dark .modal {
          background: #2d2d2d;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .dark .modal-title {
          color: #e0e0e0;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        .close-button:hover {
          background: #f0f0f0;
        }
        
        .dark .close-button:hover {
          background: #404040;
        }
        
        .app-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .dark .detail-row {
          border-bottom-color: #404040;
        }
        
        .detail-label {
          font-weight: 500;
          color: #666;
        }
        
        .detail-value {
          color: #333;
          word-break: break-all;
        }
        
        .dark .detail-value {
          color: #e0e0e0;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 24px;
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
      </style>
      
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${this.app.title}</h2>
          <button class="close-button" id="close-modal">&times;</button>
        </div>
        
        <div class="app-details">
          <div class="detail-row">
            <span class="detail-label">Domain:</span>
            <span class="detail-value">${this.app.domain}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Path:</span>
            <span class="detail-value">${this.app.path}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Permissions:</span>
            <span class="detail-value">${this.app.permissions}</span>
          </div>
          
          <div class="action-buttons">
            <button class="action-button secondary-button" id="remove-app">
              Remove
            </button>
            <button class="action-button primary-button" id="open-app">
              Open App
            </button>
          </div>
        </div>
      </div>
    `
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return

    // Close modal
    this.shadowRoot.getElementById('close-modal')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true }))
    })

    // Remove app
    this.shadowRoot.getElementById('remove-app')?.addEventListener('click', () => {
      if (this.app) {
        this.removeApp(this.app)
      }
    })

    // Open app
    this.shadowRoot.getElementById('open-app')?.addEventListener('click', () => {
      if (this.app) {
        this.openApp(this.app)
      }
    })

    // Close on backdrop click
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target === this.shadowRoot) {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true }))
      }
    })
  }

  private async removeApp(app: App) {
    try {
      const result = await chrome.storage.local.get(['apps'])
      const apps = result.apps || []
      const updatedApps = apps.filter((a: App) => a.id !== app.id)
      await chrome.storage.local.set({ apps: updatedApps })
      
      this.dispatchEvent(new CustomEvent('app-removed', {
        detail: { app },
        bubbles: true
      }))
      
      this.dispatchEvent(new CustomEvent('close', { bubbles: true }))
    } catch (error) {
      console.error('Failed to remove app:', error)
    }
  }

  private openApp(app: App) {
    chrome.tabs.create({ url: app.id })
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }))
  }
}

customElements.define('app-item', AppItem) 