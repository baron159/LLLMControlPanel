export class NavBar extends HTMLElement {
  private currentView: 'apps' | 'activity' | 'chat' = 'apps'

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    console.log('NavBar constructor called')
  }

  connectedCallback() {
    console.log('NavBar connectedCallback called')
    this.render()
    this.setupEventListeners()
    this.initializeTheme()
  }

  private initializeTheme() {
    // Import theme manager dynamically to avoid circular dependencies
    import('../../core/utils/theme-manager').then(({ ThemeManager }) => {
      const themeManager = ThemeManager.getInstance()
      const currentTheme = themeManager.getTheme()
      this.applyTheme(currentTheme)
      
      themeManager.addListener((theme) => {
        console.log('NavBar: Theme changed to:', theme)
        this.applyTheme(theme)
      })
    }).catch(error => {
      console.error('NavBar: Failed to load theme manager:', error)
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
          <button class="nav-tab ${this.currentView === 'chat' ? 'active' : ''}" data-view="chat" title="Chat" aria-label="Chat">
            <!-- chat icon -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <path d="M20 2H4C2.895 2 2 2.895 2 4V18C2 19.105 2.895 20 4 20H18L22 24V4C22 2.895 21.105 2 20 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 8H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 12H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div class="nav-actions">
          <button class="nav-button" data-action="help" title="Help" aria-label="Help">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
              <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
          </button>
          <button class="nav-button" data-action="settings" title="Settings" aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="10" cy="6" r="2" stroke="currentColor" stroke-width="2"/>
              <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="14" cy="12" r="2" stroke="currentColor" stroke-width="2"/>
              <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="8" cy="18" r="2" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="nav-button" data-action="popout" title="Open in new tab" aria-label="Open in new tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
              <path d="M14 3h7v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 14v6a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
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
        const target = e.currentTarget as HTMLElement
        const view = target.dataset.view as 'apps' | 'activity' | 'chat'
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
        const target = e.currentTarget as HTMLElement
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