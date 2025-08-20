export class SlidingPane extends HTMLElement {
  private shown = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    console.log('SlidingPane constructor called')
  }

  connectedCallback() {
    console.log('SlidingPane connectedCallback called')
    this.render()
    this.initializeTheme()
  }

  private initializeTheme() {
    // Import theme manager dynamically to avoid circular dependencies
    import('../../core/utils/theme-manager').then(({ ThemeManager }) => {
      const themeManager = ThemeManager.getInstance()
      const currentTheme = themeManager.getTheme()
      this.applyTheme(currentTheme)
      
      themeManager.addListener((theme) => {
        console.log('SlidingPane: Theme changed to:', theme)
        this.applyTheme(theme)
      })
    }).catch(error => {
      console.error('SlidingPane: Failed to load theme manager:', error)
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

  static get observedAttributes() {
    return ['shown']
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'shown') {
      console.log('SlidingPane: attributeChangedCallback - shown:', newValue)
      this.shown = newValue === 'true'
      this.render()
    }
  }

  private render() {
    if (!this.shadowRoot) return
    console.log('SlidingPane render called, shown:', this.shown)

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        :host([shown]) {
          opacity: 1;
          visibility: visible;
        }
        
        .pane {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          background: white;
          transform: translateX(100%);
          transition: transform 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
        }
        
        .dark .pane {
          background: #2d2d2d;
        }
        
        :host([shown]) .pane {
          transform: translateX(0);
        }
        
        .pane-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
          flex-shrink: 0;
        }
        
        .dark .pane-header {
          border-bottom-color: #404040;
        }
        
        .pane-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .dark .pane-title {
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
        
        .pane-content {
          padding: 16px;
          flex: 1;
          overflow-y: auto;
        }
      </style>
      
      <div class="pane">
        <div class="pane-header">
          <h2 class="pane-title">
            <slot name="title">Settings</slot>
          </h2>
          <button class="close-button" id="close-pane">&times;</button>
        </div>
        <div class="pane-content">
          <slot></slot>
        </div>
      </div>
    `
    console.log('SlidingPane render completed')
    
    // Setup event listeners after DOM is created
    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return
    console.log('SlidingPane setupEventListeners called')

    // Close button
    this.shadowRoot.getElementById('close-pane')?.addEventListener('click', () => {
      console.log('SlidingPane: Close button clicked')
      this.hide()
    })

    // Close on backdrop click
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target === this.shadowRoot) {
        console.log('SlidingPane: Backdrop clicked')
        this.hide()
      }
    })

    console.log('SlidingPane: Event listeners setup completed')
  }

  show() {
    console.log('SlidingPane: show() called')
    this.setAttribute('shown', 'true')
  }

  hide() {
    console.log('SlidingPane: hide() called')
    this.removeAttribute('shown')
    
    // Dispatch custom event to notify parent components
    const event = new CustomEvent('pane-closed', {
      bubbles: true,
      composed: true,
      detail: { paneId: this.id }
    })
    console.log('SlidingPane: Dispatching pane-closed event:', event)
    this.dispatchEvent(event)
  }

  toggle() {
    console.log('SlidingPane: toggle() called, current shown:', this.shown)
    if (this.shown) {
      this.hide()
    } else {
      this.show()
    }
  }
}

customElements.define('sliding-pane', SlidingPane) 