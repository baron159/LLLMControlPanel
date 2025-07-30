export interface WebNNDevice {
  name: string
  type: 'npu' | 'gpu' | 'cpu'
  supported: boolean
  performance?: number
}

export interface WebNNProviderConfig {
  deviceType: 'npu' | 'gpu' | 'cpu'
  deviceName?: string
  optimizationLevel?: 'all' | 'basic' | 'disabled'
  enableQuantization?: boolean
  enablePruning?: boolean
}

export class WebNNUtils {
  private static instance: WebNNUtils
  private devices: WebNNDevice[] = []
  private initialized = false

  private constructor() {}

  static getInstance(): WebNNUtils {
    if (!WebNNUtils.instance) {
      WebNNUtils.instance = new WebNNUtils()
    }
    return WebNNUtils.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Check if WebNN is available
      if (typeof (navigator as any).ml === 'undefined') {
        console.warn('WebNN not available in this browser')
        this.initialized = true
        return
      }

      // Get available devices
      await this.detectDevices()
      this.initialized = true
      console.log('WebNN initialized with devices:', this.devices)
    } catch (error) {
      console.error('Failed to initialize WebNN:', error)
      this.initialized = true
    }
  }

  private async detectDevices(): Promise<void> {
    try {
      // Check for NPU devices first (highest priority)
      const npuDevices = await this.checkNPUDevices()
      this.devices.push(...npuDevices)

      // Check for GPU devices
      const gpuDevices = await this.checkGPUDevices()
      this.devices.push(...gpuDevices)

      // Check for CPU device
      const cpuDevice = await this.checkCPUDevice()
      this.devices.push(cpuDevice)

      // Sort devices by priority: npu > gpu > cpu
      this.devices.sort((a, b) => {
        const priority = { npu: 3, gpu: 2, cpu: 1 }
        return priority[b.type] - priority[a.type]
      })
    } catch (error) {
      console.error('Error detecting WebNN devices:', error)
    }
  }

  private async checkNPUDevices(): Promise<WebNNDevice[]> {
    const npuDevices: WebNNDevice[] = []
    
    try {
      // Check for common NPU device names
      const npuNames = [
        'npu', 'neural', 'ai', 'ml', 'tensor', 'accelerator',
        'qualcomm', 'snapdragon', 'mediatek', 'dimensity',
        'apple', 'neural-engine', 'ane'
      ]

      for (const name of npuNames) {
        try {
          // This is a simplified check - in real implementation,
          // you would use the WebNN API to query available devices
          const device: WebNNDevice = {
            name: name,
            type: 'npu',
            supported: true,
            performance: 100 // Mock performance score
          }
          npuDevices.push(device)
        } catch (error) {
          // Device not available
        }
      }
    } catch (error) {
      console.warn('NPU detection failed:', error)
    }

    return npuDevices
  }

  private async checkGPUDevices(): Promise<WebNNDevice[]> {
    const gpuDevices: WebNNDevice[] = []
    
    try {
      // Check for WebGPU support
      if ((navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter()
        if (adapter) {
          const device: WebNNDevice = {
            name: adapter.name || 'gpu',
            type: 'gpu',
            supported: true,
            performance: 80 // Mock performance score
          }
          gpuDevices.push(device)
        }
      }

      // Check for other GPU devices
      const gpuNames = ['gpu', 'graphics', 'video', 'display']
      for (const name of gpuNames) {
        try {
          const device: WebNNDevice = {
            name: name,
            type: 'gpu',
            supported: true,
            performance: 70
          }
          gpuDevices.push(device)
        } catch (error) {
          // Device not available
        }
      }
    } catch (error) {
      console.warn('GPU detection failed:', error)
    }

    return gpuDevices
  }

  private async checkCPUDevice(): Promise<WebNNDevice> {
    return {
      name: 'cpu',
      type: 'cpu',
      supported: true,
      performance: 30 // Lowest performance for CPU
    }
  }

  getAvailableDevices(): WebNNDevice[] {
    return [...this.devices]
  }

  getPreferredDevice(): WebNNDevice | null {
    // Return the first available device (already sorted by priority)
    return this.devices.find(device => device.supported) || null
  }

  getDeviceByName(name: string): WebNNDevice | null {
    return this.devices.find(device => device.name === name) || null
  }

  getDevicesByType(type: 'npu' | 'gpu' | 'cpu'): WebNNDevice[] {
    return this.devices.filter(device => device.type === type && device.supported)
  }

  isWebNNAvailable(): boolean {
    return typeof (navigator as any).ml !== 'undefined'
  }

  async createWebNNContext(config?: WebNNProviderConfig): Promise<any> {
    if (!this.isWebNNAvailable()) {
      throw new Error('WebNN not available')
    }

    const device = config?.deviceName 
      ? this.getDeviceByName(config.deviceName)
      : this.getPreferredDevice()

    if (!device) {
      throw new Error('No suitable WebNN device found')
    }

    // In a real implementation, you would create a WebNN context
    // with the specified device and configuration
    console.log(`Creating WebNN context with device: ${device.name} (${device.type})`)
    
    return {
      device: device.name,
      type: device.type,
      config: config || {}
    }
  }

  getDeviceCapabilities(deviceName: string): any {
    const device = this.getDeviceByName(deviceName)
    if (!device) {
      return null
    }

    // Mock capabilities based on device type
    const capabilities = {
      npu: {
        maxBatchSize: 32,
        supportedOps: ['conv2d', 'matmul', 'add', 'mul', 'relu'],
        quantization: true,
        pruning: true
      },
      gpu: {
        maxBatchSize: 16,
        supportedOps: ['conv2d', 'matmul', 'add', 'mul', 'relu'],
        quantization: true,
        pruning: false
      },
      cpu: {
        maxBatchSize: 8,
        supportedOps: ['conv2d', 'matmul', 'add', 'mul', 'relu'],
        quantization: false,
        pruning: false
      }
    }

    return capabilities[device.type] || capabilities.cpu
  }
} 