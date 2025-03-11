function saveOptions() {
  const apiUrlInput = document.getElementById('api-url');
  const apiUrl = apiUrlInput.value.trim();
  const model = document.getElementById('model').value;
  const length = document.getElementById('length').value;
  const ollamaModel = document.getElementById('ollama-model').value.trim();

  const status = document.getElementById('status');

  if (apiUrl && !apiUrl.startsWith('http')) {
    status.textContent = 'API URL must start with http:// or https://';
    status.className = 'status error';
    status.style.display = 'block';
    return;
  }

  chrome.storage.sync.set({
    apiUrl: apiUrl || 'http://localhost:8000/summarize',
    model: model,
    length: length,
    ollamaModel: ollamaModel
  }, function() {
    status.textContent = 'Options saved!';
    status.className = 'status success';
    status.style.display = 'block';

    testApiConnection(apiUrl || 'http://localhost:8000/summarize');

    setTimeout(function() {
      status.style.display = 'none';
    }, 2000);
  });
}

function loadOptions() {
  chrome.storage.sync.get({
    apiUrl: 'http://localhost:8000/summarize',
    model: 'gemini-2.0-flash',
    length: 'short',
    ollamaModel: 'ollama:llama3.2:latest'
  }, function(items) {
    document.getElementById('api-url').value = items.apiUrl;
    document.getElementById('model').value = items.model;
    document.getElementById('length').value = items.length;
    document.getElementById('ollama-model').value = items.ollamaModel;

    const modelSelect = document.getElementById('model');
    modelSelect.dispatchEvent(new Event('change'));
  });
}

document.addEventListener('DOMContentLoaded', function() {
  loadOptions();

  document.getElementById('save').addEventListener('click', saveOptions);

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

  const apiStatus = document.createElement('div');
  apiStatus.id = 'api-status';
  apiStatus.className = 'status';
  apiStatus.style.display = 'none';

  const statusDiv = document.getElementById('status');
  statusDiv.parentNode.insertBefore(apiStatus, statusDiv.nextSibling);

  const modelSelect = document.getElementById('model');
  const ollamaOptions = document.querySelector('.ollama-options');

  modelSelect.addEventListener('change', function() {
    if (modelSelect.value === 'ollama') {
      ollamaOptions.style.display = 'block';
    } else {
      ollamaOptions.style.display = 'none';
    }
  });

  modelSelect.dispatchEvent(new Event('change'));
});