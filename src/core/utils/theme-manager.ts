export class ThemeManager {
  private static instance: ThemeManager
  private currentTheme: 'light' | 'dark' = 'light'
  private listeners: ((theme: 'light' | 'dark') => void)[] = []

  private constructor() {
    this.loadTheme()
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
    }
    return ThemeManager.instance
  }

  private async loadTheme() {
    try {
      console.log('ThemeManager: Loading theme from storage...')
      const result = await chrome.storage.local.get(['theme'])
      console.log('ThemeManager: Storage result:', result)
      this.currentTheme = result.theme || 'light'
      console.log('ThemeManager: Current theme set to:', this.currentTheme)
      this.applyTheme()
    } catch (error) {
      console.error('ThemeManager: Failed to load theme:', error)
      this.currentTheme = 'light'
      this.applyTheme()
    }
  }

  private async saveTheme() {
    try {
      await chrome.storage.local.set({ theme: this.currentTheme })
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  private applyTheme() {
    console.log('ThemeManager: Applying theme:', this.currentTheme)
    // Apply theme to document
    if (this.currentTheme === 'dark') {
      document.documentElement.classList.add('dark')
      console.log('ThemeManager: Added dark class to document')
    } else {
      document.documentElement.classList.remove('dark')
      console.log('ThemeManager: Removed dark class from document')
    }

    // Notify listeners
    console.log('ThemeManager: Notifying', this.listeners.length, 'listeners')
    this.listeners.forEach(listener => listener(this.currentTheme))
  }

  getTheme(): 'light' | 'dark' {
    return this.currentTheme
  }

  async setTheme(theme: 'light' | 'dark') {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme
      this.applyTheme()
      await this.saveTheme()
    }
  }

  async toggleTheme() {
    console.log('ThemeManager: Toggle theme called, current theme:', this.currentTheme)
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light'
    console.log('ThemeManager: Switching to theme:', newTheme)
    await this.setTheme(newTheme)
  }

  addListener(listener: (theme: 'light' | 'dark') => void) {
    this.listeners.push(listener)
    // Call immediately with current theme
    listener(this.currentTheme)
  }

  removeListener(listener: (theme: 'light' | 'dark') => void) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }
} 