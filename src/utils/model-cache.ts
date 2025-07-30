export interface CachedModel {
  id: string
  name: string
  version: string
  data: ArrayBuffer
  size: number
  provider: string
  timestamp: number
  checksum: string
}

export interface CacheStats {
  totalSize: number
  modelCount: number
  availableSpace: number
}

export class ModelCache {
  private static instance: ModelCache
  private cachePrefix = 'llm_model_cache_'
  private metadataKey = 'llm_model_metadata'

  private constructor() {}

  static getInstance(): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache()
    }
    return ModelCache.instance
  }

  /**
   * Cache a model in persistent storage
   */
  async cacheModel(
    modelId: string,
    modelName: string,
    modelData: ArrayBuffer,
    provider: string,
    version: string = '1.0.0'
  ): Promise<boolean> {
    try {
      // Generate checksum for data integrity
      const checksum = await this.generateChecksum(modelData)
      
      const cachedModel: CachedModel = {
        id: modelId,
        name: modelName,
        version,
        data: modelData,
        size: modelData.byteLength,
        provider,
        timestamp: Date.now(),
        checksum
      }

      // Store model data
      const dataKey = `${this.cachePrefix}${modelId}`
      await chrome.storage.local.set({ [dataKey]: cachedModel })

      // Update metadata
      await this.updateMetadata(modelId, cachedModel)

      console.log(`Model ${modelId} cached successfully (${this.formatBytes(modelData.byteLength)})`)
      return true
    } catch (error) {
      console.error('Failed to cache model:', error)
      return false
    }
  }

  /**
   * Retrieve a cached model
   */
  async getCachedModel(modelId: string): Promise<CachedModel | null> {
    try {
      const dataKey = `${this.cachePrefix}${modelId}`
      const result = await chrome.storage.local.get([dataKey])
      
      if (!result[dataKey]) {
        return null
      }

      const cachedModel: CachedModel = result[dataKey]

      // Verify checksum
      const currentChecksum = await this.generateChecksum(cachedModel.data)
      if (currentChecksum !== cachedModel.checksum) {
        console.warn(`Model ${modelId} checksum mismatch, removing corrupted cache`)
        await this.removeCachedModel(modelId)
        return null
      }

      console.log(`Retrieved cached model ${modelId} (${this.formatBytes(cachedModel.size)})`)
      return cachedModel
    } catch (error) {
      console.error('Failed to retrieve cached model:', error)
      return null
    }
  }

  /**
   * Check if a model is cached
   */
  async isModelCached(modelId: string): Promise<boolean> {
    const cachedModel = await this.getCachedModel(modelId)
    return cachedModel !== null
  }

  /**
   * Remove a cached model
   */
  async removeCachedModel(modelId: string): Promise<boolean> {
    try {
      const dataKey = `${this.cachePrefix}${modelId}`
      await chrome.storage.local.remove([dataKey])
      
      // Update metadata
      await this.removeFromMetadata(modelId)
      
      console.log(`Removed cached model ${modelId}`)
      return true
    } catch (error) {
      console.error('Failed to remove cached model:', error)
      return false
    }
  }

  /**
   * Clear all cached models
   */
  async clearAllCachedModels(): Promise<boolean> {
    try {
      const keys = await chrome.storage.local.get(null)
      const modelKeys = Object.keys(keys).filter(key => key.startsWith(this.cachePrefix))
      
      if (modelKeys.length > 0) {
        await chrome.storage.local.remove(modelKeys)
      }
      
      // Clear metadata
      await chrome.storage.local.remove([this.metadataKey])
      
      console.log(`Cleared ${modelKeys.length} cached models`)
      return true
    } catch (error) {
      console.error('Failed to clear cached models:', error)
      return false
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const keys = await chrome.storage.local.get(null)
      const modelKeys = Object.keys(keys).filter(key => key.startsWith(this.cachePrefix))
      
      let totalSize = 0
      let modelCount = 0
      
      for (const key of modelKeys) {
        const cachedModel: CachedModel = keys[key]
        if (cachedModel && cachedModel.size) {
          totalSize += cachedModel.size
          modelCount++
        }
      }

      // Estimate available space (Chrome extension storage limit is typically 5MB)
      const availableSpace = 5 * 1024 * 1024 - totalSize

      return {
        totalSize,
        modelCount,
        availableSpace: Math.max(0, availableSpace)
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return {
        totalSize: 0,
        modelCount: 0,
        availableSpace: 0
      }
    }
  }

  /**
   * Get list of all cached models
   */
  async getCachedModels(): Promise<CachedModel[]> {
    try {
      const keys = await chrome.storage.local.get(null)
      const modelKeys = Object.keys(keys).filter(key => key.startsWith(this.cachePrefix))
      
      const cachedModels: CachedModel[] = []
      
      for (const key of modelKeys) {
        const cachedModel: CachedModel = keys[key]
        if (cachedModel) {
          cachedModels.push(cachedModel)
        }
      }

      return cachedModels.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Failed to get cached models:', error)
      return []
    }
  }

  /**
   * Clean up old cached models based on age or size
   */
  async cleanupOldModels(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cachedModels = await this.getCachedModels()
      const now = Date.now()
      let removedCount = 0

      for (const model of cachedModels) {
        if (now - model.timestamp > maxAge) {
          await this.removeCachedModel(model.id)
          removedCount++
        }
      }

      console.log(`Cleaned up ${removedCount} old cached models`)
      return removedCount
    } catch (error) {
      console.error('Failed to cleanup old models:', error)
      return 0
    }
  }

  /**
   * Update model metadata
   */
  private async updateMetadata(modelId: string, cachedModel: CachedModel): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.metadataKey])
      const metadata = result[this.metadataKey] || {}
      
      metadata[modelId] = {
        name: cachedModel.name,
        version: cachedModel.version,
        size: cachedModel.size,
        provider: cachedModel.provider,
        timestamp: cachedModel.timestamp
      }

      await chrome.storage.local.set({ [this.metadataKey]: metadata })
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  /**
   * Remove model from metadata
   */
  private async removeFromMetadata(modelId: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.metadataKey])
      const metadata = result[this.metadataKey] || {}
      
      delete metadata[modelId]
      
      await chrome.storage.local.set({ [this.metadataKey]: metadata })
    } catch (error) {
      console.error('Failed to remove from metadata:', error)
    }
  }

  /**
   * Generate checksum for data integrity
   */
  private async generateChecksum(data: ArrayBuffer): Promise<string> {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('Failed to generate checksum:', error)
      return ''
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Check if there's enough space for a model
   */
  async hasEnoughSpace(modelSize: number): Promise<boolean> {
    const stats = await this.getCacheStats()
    return stats.availableSpace >= modelSize
  }

  /**
   * Get cache usage percentage
   */
  async getCacheUsagePercentage(): Promise<number> {
    const stats = await this.getCacheStats()
    const totalSpace = 5 * 1024 * 1024 // 5MB limit
    return (stats.totalSize / totalSpace) * 100
  }
} 