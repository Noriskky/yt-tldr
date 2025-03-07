// Save options to Chrome storage with validation
function saveOptions() {
  const apiUrlInput = document.getElementById('api-url');
  const apiUrl = apiUrlInput.value.trim();
  const model = document.getElementById('model').value;
  const length = document.getElementById('length').value;
  
  const status = document.getElementById('status');
  
  // Validate API URL
  if (apiUrl && !apiUrl.startsWith('http')) {
    status.textContent = 'API URL must start with http:// or https://';
    status.className = 'status error';
    status.style.display = 'block';
    return;
  }
  
  // Save options
  chrome.storage.sync.set({
    apiUrl: apiUrl || 'http://localhost:8000/summarize',
    model: model,
    length: length
  }, function() {
    status.textContent = 'Options saved!';
    status.className = 'status success';
    status.style.display = 'block';
    
    // Test API connection
    testApiConnection(apiUrl || 'http://localhost:8000/summarize');
    
    setTimeout(function() {
      status.style.display = 'none';
    }, 2000);
  });
}

// Test API connection
async function testApiConnection(url) {
  const status = document.getElementById('api-status');
  if (!status) return;
  
  try {
    status.textContent = 'Testing API connection...';
    status.className = 'status';
    status.style.display = 'block';
    
    // Extract base URL for health check
    const baseUrl = url.split('/').slice(0, -1).join('/');
    const healthUrl = `${baseUrl}/health`;
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    if (response.ok) {
      status.textContent = 'API connection successful!';
      status.className = 'status success';
    } else {
      status.textContent = `API responded with status: ${response.status}`;
      status.className = 'status error';
    }
  } catch (error) {
    status.textContent = `API connection failed: ${error.message}`;
    status.className = 'status error';
  }
}

// Load saved options
function loadOptions() {
  chrome.storage.sync.get({
    apiUrl: 'http://localhost:8000/summarize',
    model: 'llama3.2:latest',
    length: 'short'
  }, function(items) {
    document.getElementById('api-url').value = items.apiUrl;
    document.getElementById('model').value = items.model;
    document.getElementById('length').value = items.length;
  });
}

// Initialize options page with enhanced functionality
document.addEventListener('DOMContentLoaded', function() {
  loadOptions();
  
  // Add event listeners
  document.getElementById('save').addEventListener('click', saveOptions);
  
  // Add API test button
  const testBtn = document.createElement('button');
  testBtn.id = 'test-api';
  testBtn.textContent = 'Test API Connection';
  testBtn.style.marginLeft = '10px';
  testBtn.addEventListener('click', function() {
    const apiUrl = document.getElementById('api-url').value.trim() || 'http://localhost:8000/summarize';
    testApiConnection(apiUrl);
  });
  
  const saveBtn = document.getElementById('save');
  saveBtn.parentNode.insertBefore(testBtn, saveBtn.nextSibling);
  
  // Add API status indicator
  const apiStatus = document.createElement('div');
  apiStatus.id = 'api-status';
  apiStatus.className = 'status';
  apiStatus.style.display = 'none';
  
  const statusDiv = document.getElementById('status');
  statusDiv.parentNode.insertBefore(apiStatus, statusDiv.nextSibling);
});
