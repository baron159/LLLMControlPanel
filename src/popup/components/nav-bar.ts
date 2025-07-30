export class NavBar extends HTMLElement {
  private currentView: 'apps' | 'activity' = 'apps'

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    console.log('NavBar constructor called')
  }

  connectedCallback() {
    console.log('NavBar connectedCallback called')
    this.render()
    this.setupEventListeners()
  }

  private render() {
    if (!this.shadowRoot) return
    console.log('NavBar render called, currentView:', this.currentView)

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .nav-tabs {
          display: flex;
          gap: 8px;
        }
        
        .nav-tab {
          padding: 8px 16px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s ease;
        }
        
        .nav-tab:hover {
          background: #f0f0f0;
          color: #333;
        }
        
        .dark .nav-tab:hover {
          background: #404040;
          color: #e0e0e0;
        }
        
        .nav-tab.active {
          background: #007AFF;
          color: white;
        }
        
        .nav-actions {
          display: flex;
          gap: 8px;
        }
        
        .nav-button {
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
          transition: all 0.2s ease;
        }
        
        .nav-button:hover {
          background: #f0f0f0;
          color: #333;
        }
        
        .dark .nav-button:hover {
          background: #404040;
          color: #e0e0e0;
        }
      </style>
      
      <div class="nav-container">
        <div class="nav-tabs">
          <button class="nav-tab ${this.currentView === 'apps' ? 'active' : ''}" data-view="apps">
            Apps
          </button>
          <button class="nav-tab ${this.currentView === 'activity' ? 'active' : ''}" data-view="activity">
            Activity
          </button>
        </div>
        
        <div class="nav-actions">
          <button class="nav-button" data-action="help">Help</button>
          <button class="nav-button" data-action="about">About</button>
          <button class="nav-button" data-action="settings">Settings</button>
        </div>
      </div>
    `
    console.log('NavBar render completed')
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return
    console.log('NavBar setupEventListeners called')

    // Tab navigation
    this.shadowRoot.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const view = target.dataset.view as 'apps' | 'activity'
        console.log('NavBar: Tab clicked:', view)
        this.currentView = view
        this.render()
        
        // Dispatch custom event
        const event = new CustomEvent('view-change', {
          detail: { view },
          bubbles: true
        })
        console.log('NavBar: Dispatching view-change event:', event)
        this.dispatchEvent(event)
      })
    })

    // Action buttons
    this.shadowRoot.querySelectorAll('.nav-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const action = target.dataset.action
        
        console.log('NavBar: Action button clicked:', action)
        
        if (action) {
          const event = new CustomEvent(`show-${action}`, {
            bubbles: true,
            composed: true
          })
          console.log('NavBar: Dispatching event:', event.type)
          document.dispatchEvent(event)
        }
      })
    })

    console.log('NavBar: Event listeners setup completed')
  }
}

customElements.define('nav-bar', NavBar) 