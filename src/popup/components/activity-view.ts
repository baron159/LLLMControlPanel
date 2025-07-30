export interface ActivityItem {
  id: string
  timestamp: number
  type: 'request' | 'response' | 'error'
  app: string
  message: string
}

export class ActivityView extends HTMLElement {
  private activities: ActivityItem[] = []

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.loadActivities()
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
  }

  private async loadActivities() {
    try {
      const result = await chrome.storage.local.get(['activities'])
      this.activities = result.activities || []
      this.render()
    } catch (error) {
      console.error('Failed to load activities:', error)
      this.activities = []
    }
  }

  private render() {
    if (!this.shadowRoot) return

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .activity-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .activity-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .dark .activity-title {
          color: #e0e0e0;
        }
        
        .clear-button {
          padding: 6px 12px;
          border: none;
          background: #f0f0f0;
          color: #666;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        
        .clear-button:hover {
          background: #e0e0e0;
          color: #333;
        }
        
        .dark .clear-button {
          background: #404040;
          color: #ccc;
        }
        
        .dark .clear-button:hover {
          background: #505050;
          color: #e0e0e0;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .activity-item {
          padding: 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          transition: all 0.2s ease;
        }
        
        .dark .activity-item {
          background: #2d2d2d;
          border-color: #404040;
        }
        
        .activity-item:hover {
          border-color: #007AFF;
        }
        
        .activity-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .activity-app {
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }
        
        .dark .activity-app {
          color: #e0e0e0;
        }
        
        .activity-time {
          font-size: 12px;
          color: #666;
        }
        
        .activity-type {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .activity-type.request {
          background: rgba(0, 122, 255, 0.1);
          color: #007AFF;
        }
        
        .activity-type.response {
          background: rgba(52, 199, 89, 0.1);
          color: #34C759;
        }
        
        .activity-type.error {
          background: rgba(255, 59, 48, 0.1);
          color: #FF3B30;
        }
        
        .activity-message {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
          word-break: break-word;
        }
        
        .dark .activity-message {
          color: #ccc;
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
      
      <div class="activity-container">
        <div class="activity-header">
          <h3 class="activity-title">Recent Activity</h3>
          <button class="clear-button" id="clear-activities">Clear All</button>
        </div>
        
        <div class="activity-list">
          ${this.activities.length > 0 ? 
            this.activities.map(activity => `
              <div class="activity-item">
                <div class="activity-header-row">
                  <span class="activity-app">${activity.app}</span>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="activity-type ${activity.type}">${activity.type}</span>
                    <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                  </div>
                </div>
                <div class="activity-message">${this.truncateMessage(activity.message)}</div>
              </div>
            `).join('') :
            `<div class="empty-state">
              <h3>No activity yet</h3>
              <p>Your LLM interactions will appear here</p>
            </div>`
          }
        </div>
      </div>
    `
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return

    // Clear activities
    this.shadowRoot.getElementById('clear-activities')?.addEventListener('click', () => {
      this.clearActivities()
    })
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now'
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  private truncateMessage(message: string): string {
    if (message.length <= 100) {
      return message
    }
    return message.substring(0, 100) + '...'
  }

  private async clearActivities() {
    try {
      await chrome.storage.local.set({ activities: [] })
      this.activities = []
      this.render()
    } catch (error) {
      console.error('Failed to clear activities:', error)
    }
  }
}

customElements.define('activity-view', ActivityView) 