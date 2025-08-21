/**
 * Test script for the LLM Control Panel Service Worker
 * This script can be used to test the service worker functionality
 */

// Test the service worker message handling
async function testServiceWorker() {
  console.log('Testing LLM Control Panel Service Worker...');
  
  try {
    // Test status message
    console.log('\n1. Testing status message...');
    const statusResponse = await chrome.runtime.sendMessage({ type: 'status' });
    console.log('Status response:', statusResponse);
    
    // Test adding a model
    console.log('\n2. Testing add model...');
    const addModelResponse = await chrome.runtime.sendMessage({
      type: 'addModel',
      modelConfig: {
        modelId: 'test/model-1',
        urlBase: 'https://huggingface.co',
        onnxDir: 'onnx',
        configFileName: 'config.json',
        repoBase: 'resolve/main',
        modelFileName: 'model.onnx'
      }
    });
    console.log('Add model response:', addModelResponse);
    
    // Test status again to see the new model
    console.log('\n3. Testing status after adding model...');
    const statusResponse2 = await chrome.runtime.sendMessage({ type: 'status' });
    console.log('Status response:', statusResponse2);
    
    // Test setting selected model
    console.log('\n4. Testing set selected model...');
    const setModelResponse = await chrome.runtime.sendMessage({
      type: 'setSelectedModel',
      modelId: 'test/model-1'
    });
    console.log('Set model response:', setModelResponse);
    
    // Test download model (this will likely fail since it's a test model)
    console.log('\n5. Testing download model...');
    const downloadResponse = await chrome.runtime.sendMessage({
      type: 'downloadModel',
      modelId: 'test/model-1'
    });
    console.log('Download response:', downloadResponse);
    
    // Final status check
    console.log('\n6. Final status check...');
    const finalStatus = await chrome.runtime.sendMessage({ type: 'status' });
    console.log('Final status:', finalStatus);
    
    console.log('\n✅ Service worker test completed!');
    
  } catch (error) {
    console.error('❌ Service worker test failed:', error);
  }
}

// Test invalid message
async function testInvalidMessage() {
  console.log('\nTesting invalid message...');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'invalidType' });
    console.log('Invalid message response:', response);
  } catch (error) {
    console.error('Invalid message error:', error);
  }
}

// Run tests
if (typeof chrome !== 'undefined' && chrome.runtime) {
  testServiceWorker().then(() => {
    return testInvalidMessage();
  });
} else {
  console.log('This script should be run in a Chrome extension context');
  console.log('Load the extension and run this script in the browser console');
}