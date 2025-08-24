import './components/llm-control-panel'
import { ThemeManager } from '../core/utils/theme-manager'

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('LLM Control Panel popup initialized')
  
  // Initialize theme manager
  const themeManager = ThemeManager.getInstance()
  console.log('Theme manager initialized, current theme:', themeManager.getTheme())
  
  console.log('Document body:', document.body)
  console.log('LLM Control Panel element:', document.querySelector('llm-control-panel'))
  
  // Check if this is an approval request
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('approval') === 'true') {
    console.log('Approval request detected, checking for pending request')
    
    try {
      // Get the pending approval request from storage
      const result = await chrome.storage.local.get('pendingApprovalRequest')
      if (result.pendingApprovalRequest) {
        const { requestId, appInfo } = result.pendingApprovalRequest
        
        // Wait for the LLM Control Panel component to be ready
        const waitForComponent = () => {
          const component = document.querySelector('llm-control-panel') as any
          if (component && component.showApprovalRequest) {
            component.showApprovalRequest(requestId, appInfo)
            // Clear the stored request
            chrome.storage.local.remove('pendingApprovalRequest')
          } else {
            setTimeout(waitForComponent, 100)
          }
        }
        
        waitForComponent()
      }
    } catch (error) {
      console.error('Error handling approval request:', error)
    }
  }
})