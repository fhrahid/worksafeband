const state = {
  latest: null,
  history: [],
  workers: [],
  selectedWorkerId: null,
  workerConnected: false,
  workerLastSeen: null,
  workerAgeMs: null
};

const els = {
  backendState: document.getElementById('backendState'),
  backendMeta: document.getElementById('backendMeta'),
  workerState: document.getElementById('workerState'),
  workerMeta: document.getElementById('workerMeta'),
  temperatureValue: document.getElementById('temperatureValue'),
  temperatureTrend: document.getElementById('temperatureTrend'),
  humidityValue: document.getElementById('humidityValue'),
  humidityTrend: document.getElementById('humidityTrend'),
  heatRiskValue: document.getElementById('heatRiskValue'),
  deviceValue: document.getElementById('deviceValue'),
  fallValue: document.getElementById('fallValue'),
  workerValue: document.getElementById('workerValue'),
  gasValue: document.getElementById('gasValue'),
  gasRawValue: document.getElementById('gasRawValue'),
  gasTrend: document.getElementById('gasTrend'),
  axValue: document.getElementById('axValue'),
  ayValue: document.getElementById('ayValue'),
  azValue: document.getElementById('azValue'),
  timestampValue: document.getElementById('timestampValue'),
  workerSummaryCount: document.getElementById('workerSummaryCount'),
  workerSummaryList: document.getElementById('workerSummaryList'),
  workerGrid: document.getElementById('workerGrid'),
  rawPayload: document.getElementById('rawPayload'),
  eventList: document.getElementById('eventList')
};

function formatNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return num.toFixed(digits);
}

function heatBadgeClass(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'warning') return 'warning';
  return 'normal';
}

function statusLabel(worker) {
  if (worker.fall_detected) return 'alert';
  return worker.worker_connected ? 'online' : 'offline';
}

function statusText(worker) {
  if (worker.fall_detected) return 'Alert';
  return worker.worker_connected ? 'Online' : 'Offline';
}

function formatAge(ms) {
  if (!Number.isFinite(ms)) return '--';
  if (ms < 1000) return 'just now';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

function updateWorkerStatus() {
  if (!state.latest) {
    els.workerState.textContent = 'Unknown';
    els.workerMeta.textContent = 'No telemetry received yet';
    return;
  }

  const receivedAt = new Date(state.latest.received_at).getTime();
  const ageMs = Number.isFinite(receivedAt) ? Date.now() - receivedAt : Number.NaN;
  const connected = Number.isFinite(ageMs) && ageMs <= 10000;

  state.workerConnected = connected;
  state.workerLastSeen = state.latest.received_at;
  state.workerAgeMs = ageMs;

  els.workerState.textContent = connected ? 'Connected' : 'Offline';
  els.workerMeta.textContent = connected
    ? `Last seen ${formatAge(ageMs)}`
    : `Last seen ${formatAge(ageMs)} (${state.latest.received_at || 'unknown'})`;
}

function selectWorker(workerId) {
  state.selectedWorkerId = workerId;
  const selected = state.workers.find((worker) => worker.worker_id === workerId) || state.latest;
  if (!selected) {
    return;
  }

  els.workerState.textContent = selected.fall_detected ? 'Alert' : (selected.worker_connected ? 'Connected' : 'Offline');
  els.workerMeta.textContent = selected.worker_connected
    ? `Last seen ${formatAge(selected.age_ms)}`
    : `Last seen ${selected.last_seen || 'unknown'}`;
  els.temperatureValue.textContent = `${formatNumber(selected.temperature)} °C`;
  els.temperatureTrend.textContent = `Worker: ${selected.worker_id}`;
  els.humidityValue.textContent = `${formatNumber(selected.humidity)} %`;
  els.humidityTrend.textContent = selected.fall_detected ? 'Fall alert active' : 'Stable';
  els.heatRiskValue.textContent = selected.heat_risk || 'NORMAL';
  els.deviceValue.textContent = `Device: ${selected.device_type || '--'}`;
  els.fallValue.textContent = selected.fall_detected ? 'TRUE' : 'FALSE';
  els.workerValue.textContent = `Worker: ${selected.worker_id || '--'}`;
  els.gasValue.textContent = selected.gas_detected ? 'DETECTED' : 'NORMAL';
  els.gasRawValue.textContent = `${formatNumber(selected.gas_raw, 0)}`;
  els.gasTrend.textContent = selected.gas_detected ? 'Gas alert active' : 'AO sensor reading';
  els.axValue.textContent = `${formatNumber(selected.ax, 3)} g`;
  els.ayValue.textContent = `${formatNumber(selected.ay, 3)} g`;
  els.azValue.textContent = `${formatNumber(selected.az, 3)} g`;
  els.timestampValue.textContent = selected.timestamp || '--';
  els.rawPayload.textContent = JSON.stringify(selected, null, 2);
}

function renderWorkers() {
  const workers = state.workers;
  const online = workers.filter((worker) => worker.worker_connected).length;
  els.workerSummaryCount.textContent = `${online} online / ${workers.length} total`;

  if (!workers.length) {
    els.workerSummaryList.innerHTML = '<div class="worker-summary-item"><div><strong>No workers yet</strong><div class="meta">Waiting for telemetry from the ESP32 devices.</div></div><div></div><div class="status-pill offline">Idle</div></div>';
    els.workerGrid.innerHTML = '<div class="worker-card"><div><strong>No workers yet</strong><div class="subtle">Waiting for telemetry from the ESP32 devices.</div></div></div>';
    return;
  }

  els.workerSummaryList.innerHTML = workers.map((worker) => `
    <button class="worker-summary-item ${state.selectedWorkerId === worker.worker_id ? 'active' : ''}" data-worker-id="${worker.worker_id}">
      <div>
        <strong>${worker.worker_id}</strong>
        <div class="meta">${worker.device_type || 'FULL'} • ${worker.heat_risk || 'NORMAL'}</div>
      </div>
      <div>
        <div class="meta">Gas</div>
        <strong>${worker.gas_detected ? 'Detected' : 'Clear'}</strong>
      </div>
      <div class="status-pill ${statusLabel(worker)} status">${statusText(worker)}</div>
    </button>
  `).join('');

  els.workerGrid.innerHTML = workers.map((worker) => `
    <button class="worker-card ${state.selectedWorkerId === worker.worker_id ? 'active-card' : ''}" data-worker-id="${worker.worker_id}">
      <div>
        <strong>${worker.worker_id}</strong>
        <div class="subtle">${worker.device_type || 'FULL'} • Last seen ${formatAge(worker.age_ms)}</div>
      </div>
      <div>
        <div class="meta">Temp / Humidity</div>
        <strong>${formatNumber(worker.temperature)} °C</strong>
        <div class="subtle">${formatNumber(worker.humidity)} %</div>
      </div>
      <div class="worker-status status-pill ${statusLabel(worker)}">${statusText(worker)}</div>
    </button>
  `).join('');

  els.workerSummaryList.querySelectorAll('[data-worker-id]').forEach((button) => {
    button.addEventListener('click', () => selectWorker(button.dataset.workerId));
  });

  els.workerGrid.querySelectorAll('[data-worker-id]').forEach((button) => {
    button.addEventListener('click', () => selectWorker(button.dataset.workerId));
  });

  if (!state.selectedWorkerId || !workers.some((worker) => worker.worker_id === state.selectedWorkerId)) {
    state.selectedWorkerId = workers[0].worker_id;
  }

  const selected = workers.find((worker) => worker.worker_id === state.selectedWorkerId) || workers[0];
  if (selected) {
    selectWorker(selected.worker_id);
  }
}

function renderLatest() {
  const latest = state.latest;

  if (!latest) {
    els.backendState.textContent = 'Waiting';
    els.backendMeta.textContent = 'No telemetry received yet';
    els.rawPayload.textContent = 'Waiting for the first POST from the ESP32...';
    return;
  }

  els.backendState.textContent = latest.fall_detected ? 'Alert' : 'Online';
  els.backendMeta.textContent = `Last update: ${latest.received_at}`;
  els.temperatureValue.textContent = `${formatNumber(latest.temperature)} °C`;
  els.temperatureTrend.textContent = `Timestamp: ${latest.timestamp}`;
  els.humidityValue.textContent = `${formatNumber(latest.humidity)} %`;
  els.humidityTrend.textContent = latest.fall_detected ? 'Fall alert active' : 'Stable';
  els.heatRiskValue.textContent = latest.heat_risk || 'NORMAL';
  els.deviceValue.textContent = `Device: ${latest.device_type || '--'}`;
  els.fallValue.textContent = latest.fall_detected ? 'TRUE' : 'FALSE';
  els.workerValue.textContent = `Worker: ${latest.worker_id || '--'}`;
  els.gasValue.textContent = latest.gas_detected ? 'DETECTED' : 'NORMAL';
  els.gasRawValue.textContent = `${formatNumber(latest.gas_raw, 0)}`;
  els.gasTrend.textContent = latest.gas_detected ? 'Gas alert active' : 'AO sensor reading';
  els.axValue.textContent = `${formatNumber(latest.ax, 3)} g`;
  els.ayValue.textContent = `${formatNumber(latest.ay, 3)} g`;
  els.azValue.textContent = `${formatNumber(latest.az, 3)} g`;
  els.timestampValue.textContent = latest.timestamp || '--';
  els.rawPayload.textContent = JSON.stringify(latest, null, 2);
  updateWorkerStatus();
}

function renderHistory() {
  const items = state.history.slice(0, 8);
  if (!items.length) {
    els.eventList.innerHTML = '<div class="event"><strong>No events yet</strong><div class="meta">Waiting for telemetry from the device.</div><span class="badge normal">Idle</span></div>';
    return;
  }

  els.eventList.innerHTML = items.map((item) => {
    const badge = item.fall_detected ? 'alert' : heatBadgeClass(item.heat_risk);
    const label = item.fall_detected ? 'Fall detected' : item.heat_risk || 'NORMAL';
    return `
      <article class="event">
        <time>${item.received_at || item.timestamp || '--'}</time>
        <div>
          <strong>${item.worker_id || 'unknown'} • ${item.device_type || 'FULL'}</strong>
          <div class="meta">${formatNumber(item.temperature)} °C | ${formatNumber(item.humidity)} % | ax ${formatNumber(item.ax, 3)} g</div>
        </div>
        <span class="badge ${badge}">${label}</span>
      </article>
    `;
  }).join('');
}

async function refreshData() {
  try {
    const [historyResponse, statusResponse] = await Promise.all([
      fetch('/api/history'),
      fetch('/api/stats')
    ]);

    if (!historyResponse.ok) throw new Error(`History HTTP ${historyResponse.status}`);
    if (!statusResponse.ok) throw new Error(`Status HTTP ${statusResponse.status}`);

    const historyData = await historyResponse.json();
    const statusData = await statusResponse.json();

    state.history = Array.isArray(historyData.history) ? historyData.history : [];
    state.latest = historyData.history && historyData.history[0] ? historyData.history[0] : null;
    state.workers = Array.isArray(statusData.workers) ? statusData.workers : [];
    state.workerConnected = Boolean(statusData.worker_connected);
    state.workerLastSeen = statusData.last_seen || null;
    state.workerAgeMs = Number.isFinite(statusData.age_ms) ? statusData.age_ms : null;

    renderWorkers();
    renderLatest();
    renderHistory();
  } catch (error) {
    els.backendState.textContent = 'Offline';
    els.backendMeta.textContent = 'Could not reach backend';
    els.workerState.textContent = 'Offline';
    els.workerMeta.textContent = 'Backend unavailable';
    console.error(error);
  }
}

refreshData();
setInterval(refreshData, 1500);
