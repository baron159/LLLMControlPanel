# Testing the LLM Control Panel Extension

This guide explains how to test the ONNX Runtime Web integration in the LLM Control Panel extension.

## Prerequisites

1. **Chrome/Chromium Browser**: The extension requires a Chromium-based browser
2. **Extension Installation**: The extension must be installed and enabled
3. **WebNN Support** (Optional): For optimal performance, enable WebNN flags in Chrome

## Building the Extension

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. The built extension will be in the `dist/` directory

## Installing the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `dist/` directory
4. The extension should appear in your extensions list

## Testing with the Test Page

1. Open `test-onnx.html` in your browser
2. The page will automatically check if the extension is available
3. If the extension is not detected, you'll see a warning message

### What the Test Page Does

The test page provides a comprehensive interface to test all ONNX functionality:

#### 1. Extension Status
- Checks if the extension is installed and available
- Shows connection status

#### 2. Provider Information
- **WebNN**: Neural processing unit support
- **WebGPU**: GPU acceleration support  
- **WASM**: WebAssembly fallback support

#### 3. Model Management
- Lists available models from the extension
- Load/unload models with real ONNX operations
- Choose between main thread and Web Worker execution

#### 4. Inference Testing
- Generate responses using loaded models
- Test different input messages
- See real ONNX inference results

#### 5. Cache Management
- View cache statistics
- List cached models
- Clear cache and cleanup old models

#### 6. System Information
- Browser capabilities
- Hardware information
- Memory usage

## Testing Scenarios

### Basic Functionality
1. **Extension Detection**: Verify the extension is detected
2. **Provider Detection**: Check which ONNX providers are available
3. **Model Loading**: Load different models and verify success
4. **Inference**: Generate responses and verify they're not mocked

### Advanced Testing
1. **Web Worker vs Main Thread**: Compare performance between execution contexts
2. **Cache Operations**: Test model caching and cleanup
3. **Error Handling**: Test with invalid inputs and verify error messages
4. **Provider Fallback**: Test automatic provider selection

### Performance Testing
1. **Large Models**: Test with larger models to verify Web Worker benefits
2. **Memory Usage**: Monitor memory consumption during operations
3. **Response Time**: Measure inference latency

## Troubleshooting

### Extension Not Detected
- Verify the extension is installed and enabled
- Check browser console for errors
- Ensure the extension has proper permissions

### Provider Issues
- **WebNN**: May require Chrome flags to be enabled
- **WebGPU**: Requires compatible GPU and driver
- **WASM**: Should work in all modern browsers

### Model Loading Failures
- Check browser console for detailed error messages
- Verify model files are accessible
- Check network connectivity for remote models

### Performance Issues
- Use Web Worker for large models
- Monitor memory usage
- Check provider selection logic

## Expected Behavior

### Successful Extension Detection
```
✅ Extension Available
LLM Control Panel extension is loaded and ready to use.
```

### Provider Status
- **WebNN**: Available (if supported) with device information
- **WebGPU**: Available (if supported) with GPU adapter info
- **WASM**: Always available as fallback

### Model Operations
- Loading should show progress and success messages
- Inference should return actual ONNX-generated responses
- Cache operations should reflect real data

### Error Handling
- Clear error messages for failed operations
- Graceful fallback when providers are unavailable
- Proper validation of inputs

## Development Notes

- The extension uses real ONNX Runtime Web operations
- Mock sessions are only used when no actual model data is available
- All cache operations use the actual ModelCache implementation
- Web Worker support provides non-blocking UI operations

## Future Enhancements

1. **Real Model Loading**: Replace mock sessions with actual ONNX model files
2. **Performance Metrics**: Add detailed performance monitoring
3. **Model Validation**: Add model format and compatibility checks
4. **Advanced Caching**: Implement more sophisticated caching strategies 