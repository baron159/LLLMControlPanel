export interface App {
  id: string
  domain: string
  path: string
  title: string
  permissions: string
}

export class AppsView extends HTMLElement {
  private apps: App[] = []
  private filter: 'my-apps' | 'trending' = 'my-apps'

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.loadApps()
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
  }

  private async loadApps() {
    // Load apps from storage or use defaults
    const storedApps = await this.getStoredApps()
    this.apps = storedApps.length > 0 ? storedApps : this.getDefaultApps()
    this.render()
  }

  private async getStoredApps(): Promise<App[]> {
    try {
      const result = await chrome.storage.local.get(['apps'])
      return result.apps || []
    } catch {
      return []
    }
  }

  private getDefaultApps(): App[] {
    return [
      {
        id: "https://www.omnimodel.chat/",
        domain: "https://www.omnimodel.chat",
        path: "/",
        title: "Chatbot UI",
        permissions: "ask"
      },
      {
        id: "https://chat-vrm-window.vercel.app/",
        domain: "https://chat-vrm-window.vercel.app",
        path: "/",
        title: "ChatVRM",
        permissions: "ask"
      },
      {
        id: "https://play-chess-gpt.vercel.app/",
        domain: "https://play-chess-gpt.vercel.app",
        path: "/",
        title: "Chess GPT",
        permissions: "ask"
      },
      {
        id: "https://generative-agents-notebook-js.vercel.app/",
        domain: "https://generative-agents-notebook-js.vercel.app",
        path: "/",
        title: "Generative Agents Notebook Demo",
        permissions: "ask"
      },
      {
        id: "https://robot-companion.vercel.app/",
        domain: "https://robot-companion.vercel.app",
        path: "/",
        title: "Robot Companion with window.ai",
        permissions: "ask"
      }
    ]
  }

  private render() {
    if (!this.shadowRoot) return

    const filteredApps = this.filter === 'my-apps' ? this.apps : this.getDefaultApps()

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .apps-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .filter-tab {
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
          transition: all 0.2s ease;
        }
        
        .filter-tab:hover {
          background: #f0f0f0;
          color: #333;
        }
        
        .dark .filter-tab:hover {
          background: #404040;
          color: #e0e0e0;
        }
        
        .filter-tab.active {
          background: #007AFF;
          color: white;
        }
        
        .app-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .app-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #e0e0e0;
        }
        
        .dark .app-item {
          background: #2d2d2d;
          border-color: #404040;
        }
        
        .app-item:hover {
          background: #f8f9fa;
          border-color: #007AFF;
        }
        
        .dark .app-item:hover {
          background: #404040;
        }
        
        .app-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: #f0f0f0;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #666;
        }
        
        .app-info {
          flex: 1;
        }
        
        .app-title {
          font-weight: 500;
          margin-bottom: 4px;
          color: #333;
        }
        
        .dark .app-title {
          color: #e0e0e0;
        }
        
        .app-domain {
          font-size: 12px;
          color: #666;
        }
        
        .app-permissions {
          font-size: 10px;
          color: #007AFF;
          background: rgba(0, 122, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
          display: inline-block;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
        
        .empty-state h3 {
          margin-bottom: 8px;
          color: #333;
        }
        
        .dark .empty-state h3 {
          color: #e0e0e0;
        }
      </style>
      
      <div class="apps-container">
        <div class="filter-tabs">
          <button class="filter-tab ${this.filter === 'my-apps' ? 'active' : ''}" data-filter="my-apps">
            My Apps
          </button>
          <button class="filter-tab ${this.filter === 'trending' ? 'active' : ''}" data-filter="trending">
            Trending
          </button>
        </div>
        
        <div class="app-list">
          ${filteredApps.length > 0 ? 
            filteredApps.map(app => `
              <div class="app-item" data-app-id="${app.id}">
                <div class="app-icon">
                  ${app.title.charAt(0).toUpperCase()}
                </div>
                <div class="app-info">
                  <div class="app-title">${app.title}</div>
                  <div class="app-domain">${app.domain}</div>
                  <div class="app-permissions">${app.permissions}</div>
                </div>
              </div>
            `).join('') :
            `<div class="empty-state">
              <h3>No apps found</h3>
              <p>Add your first app to get started</p>
            </div>`
          }
        </div>
      </div>
    `
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return

    // Filter tabs
    this.shadowRoot.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const filter = target.dataset.filter as 'my-apps' | 'trending'
        this.filter = filter
        this.render()
      })
    })

    // App items
    this.shadowRoot.querySelectorAll('.app-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const appId = target.dataset.appId
        const app = this.apps.find(a => a.id === appId) || this.getDefaultApps().find(a => a.id === appId)
        
        if (app) {
          this.showAppDetails(app)
        }
      })
    })
  }

  private showAppDetails(app: App) {
    // Create and show app details modal
    const modal = document.createElement('app-item')
    modal.setAttribute('app', JSON.stringify(app))
    document.body.appendChild(modal)
    
    // Clean up when modal is closed
    modal.addEventListener('close', () => {
      document.body.removeChild(modal)
    })
  }
}

customElements.define('apps-view', AppsView) 