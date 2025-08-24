import './nav-bar'
import './apps-view'
import './activity-view'
import './settings-view'
import './help-view'
import './about-view'
import './sliding-pane'
import { ThemeManager } from '../../core/utils/theme-manager'

export class LLMControlPanel extends HTMLElement {
  private currentView: 'apps' | 'activity' = 'apps'
  private themeManager = ThemeManager.getInstance()
  private currentApprovalRequest: any = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    console.log('LLMControlPanel constructor called')
    this.initializeTheme()
    this.setupApprovalRequestListener()
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
      
      <sliding-pane id="approval-pane">
        <span slot="title">App Approval Request</span>
        <div id="approval-content">
          ${this.renderApprovalRequest()}
        </div>
      </sliding-pane>
    `
    console.log('LLMControlPanel render completed')
  }
  
  private renderApprovalRequest(): string {
    if (!this.currentApprovalRequest) {
      return '<p>No pending approval requests.</p>'
    }
    
    const { appInfo } = this.currentApprovalRequest
    return `
      <div class="approval-request">
        <h3>App Access Request</h3>
        <div class="app-info">
          <p><strong>App Name:</strong> ${appInfo.name}</p>
          <p><strong>Origin:</strong> ${appInfo.origin}</p>
          <p><strong>Description:</strong> ${appInfo.description || 'No description provided'}</p>
          <p><strong>Requested Permissions:</strong></p>
          <ul>
            ${appInfo.requestedPermissions.map((perm: string) => `<li>${perm}</li>`).join('')}
          </ul>
        </div>
        <div class="approval-actions">
          <button id="approve-btn" class="btn btn-primary">Approve</button>
          <button id="reject-btn" class="btn btn-secondary">Reject</button>
        </div>
      </div>
      <style>
        .approval-request {
          padding: 16px;
        }
        .app-info {
          margin: 16px 0;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .dark .app-info {
          background: #333;
        }
        .approval-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        .btn:hover {
          opacity: 0.8;
        }
      </style>
    `
  }
  
  private setupApprovalRequestListener() {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === 'showApprovalRequest') {
        this.currentApprovalRequest = {
          requestId: message.requestId,
          appInfo: message.appInfo
        }
        this.showApprovalPane()
      }
    })
  }
  
  // Public method to show approval request (called from popup initialization)
  public showApprovalRequest(requestId: string, appInfo: any) {
    this.currentApprovalRequest = {
      requestId,
      appInfo
    }
    this.showApprovalPane()
  }
  
  private showApprovalPane() {
    this.render() // Re-render to update approval content
    const approvalPane = this.shadowRoot?.querySelector('#approval-pane') as any
    if (approvalPane) {
      approvalPane.show()
    }
  }
  
  private handleApprovalResponse(approved: boolean) {
    if (!this.currentApprovalRequest) return
    
    chrome.runtime.sendMessage({
      type: 'approvalResponse',
      requestId: this.currentApprovalRequest.requestId,
      approved: approved,
      appInfo: this.currentApprovalRequest.appInfo
    })
    
    // Clear current request and close pane
    this.currentApprovalRequest = null
    const approvalPane = this.shadowRoot?.querySelector('#approval-pane') as any
    if (approvalPane) {
      approvalPane.hide()
    }
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
    
    // Approval request button handlers
    this.shadowRoot.addEventListener('click', (e: any) => {
      if (e.target.id === 'approve-btn') {
        this.handleApprovalResponse(true)
      } else if (e.target.id === 'reject-btn') {
        this.handleApprovalResponse(false)
      }
    })

    console.log('LLMControlPanel: Event listeners setup completed')
  }
}

customElements.define('llm-control-panel', LLMControlPanel)