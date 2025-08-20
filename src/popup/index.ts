import './components/llm-control-panel'
import { ThemeManager } from '../core/utils/theme-manager'

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('LLM Control Panel popup initialized')
  
  // Initialize theme manager
  const themeManager = ThemeManager.getInstance()
  console.log('Theme manager initialized, current theme:', themeManager.getTheme())
  
  console.log('Document body:', document.body)
  console.log('LLM Control Panel element:', document.querySelector('llm-control-panel'))
}) 