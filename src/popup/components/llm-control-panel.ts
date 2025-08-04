import './nav-bar'
import './apps-view'
import './activity-view'
import './settings-view'
import './help-view'
import './about-view'
import './sliding-pane'
import { ThemeManager } from '../../utils/theme-manager'

export class LLMControlPanel extends HTMLElement {
  private currentView: 'apps' | 'activity' = 'apps'
  private themeManager = ThemeManager.getInstance()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    console.log('LLMControlPanel constructor called')
    this.initializeTheme()
  }

  connectedCallback() {
    console.log('LLMControlPanel connectedCallback called')
    this.render()
    this.setupEventListeners()
  }

  private initializeTheme() {
    // Initialize theme manager to ensure theme is applied
    this.themeManager.getTheme()
    
    // Listen for theme changes
    this.themeManager.addListener((theme) => {
      console.log('LLMControlPanel: Theme changed to:', theme)
      this.applyTheme(theme)
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
    console.log('LLMControlPanel render called, currentView:', this.currentView)

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f8f9fa;
          color: #333;
        }
        
        .dark .container {
          background: #1a1a1a;
          color: #e0e0e0;
        }
        
        .header {
          flex: none;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 12px 16px;
        }
        
        .dark .header {
          background: #2d2d2d;
          border-bottom-color: #404040;
        }
        
        .content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        
        .view {
          display: none;
        }
        
        .view.active {
          display: block;
        }
      </style>
      
      <div class="container">
        <div class="header">
          <nav-bar></nav-bar>
        </div>
        
        <div class="content">
          <div class="view ${this.currentView === 'apps' ? 'active' : ''}" id="apps-view">
            <apps-view></apps-view>
          </div>
          
          <div class="view ${this.currentView === 'activity' ? 'active' : ''}" id="activity-view">
            <activity-view></activity-view>
          </div>
        </div>
      </div>
      
      <sliding-pane id="settings-pane">
        <span slot="title">Settings</span>
        <settings-view></settings-view>
      </sliding-pane>
      
      <sliding-pane id="help-pane">
        <span slot="title">Help</span>
        <help-view></help-view>
      </sliding-pane>
      
      <sliding-pane id="about-pane">
        <span slot="title">About</span>
        <about-view></about-view>
      </sliding-pane>
    `
    console.log('LLMControlPanel render completed')
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return
    console.log('LLMControlPanel setupEventListeners called')

    // Navigation events
    this.shadowRoot.addEventListener('view-change', (e: any) => {
      console.log('LLMControlPanel: view-change event received:', e.detail)
      this.currentView = e.detail.view
      this.render()
    })

    // Settings pane
    document.addEventListener('show-settings', () => {
      console.log('LLMControlPanel: show-settings event received')
      const settingsPane = this.shadowRoot?.querySelector('#settings-pane') as any
      console.log('LLMControlPanel: settingsPane found:', settingsPane)
      if (settingsPane) {
        console.log('LLMControlPanel: calling settingsPane.show()')
        settingsPane.show()
      } else {
        console.error('LLMControlPanel: settingsPane not found!')
      }
    })

    // Help pane
    document.addEventListener('show-help', () => {
      console.log('LLMControlPanel: show-help event received')
      const helpPane = this.shadowRoot?.querySelector('#help-pane') as any
      console.log('LLMControlPanel: helpPane found:', helpPane)
      if (helpPane) {
        console.log('LLMControlPanel: calling helpPane.show()')
        helpPane.show()
      } else {
        console.error('LLMControlPanel: helpPane not found!')
      }
    })

    // About pane
    document.addEventListener('show-about', () => {
      console.log('LLMControlPanel: show-about event received')
      const aboutPane = this.shadowRoot?.querySelector('#about-pane') as any
      console.log('LLMControlPanel: aboutPane found:', aboutPane)
      if (aboutPane) {
        console.log('LLMControlPanel: calling aboutPane.show()')
        aboutPane.show()
      } else {
        console.error('LLMControlPanel: aboutPane not found!')
      }
    })

    // Handle pane closed events
    this.shadowRoot.addEventListener('pane-closed', (e: any) => {
      console.log('LLMControlPanel: pane-closed event received:', e.detail)
      // When a pane is closed, ensure we're back to the main view
      // The main view is already visible, so no additional action needed
      // but we can add any cleanup logic here if needed
    })

    console.log('LLMControlPanel: Event listeners setup completed')
  }
}

customElements.define('llm-control-panel', LLMControlPanel) 