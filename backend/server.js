const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_HISTORY = 200;
const WORKER_OFFLINE_AFTER_MS = 10000;

const telemetryHistory = [];

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

function normalizeTelemetry(body) {
  return {
    worker_id: body.worker_id || 'unknown',
    device_type: body.device_type || 'FULL',
    temperature: Number(body.temperature),
    humidity: Number(body.humidity),
    ax: Number(body.ax),
    ay: Number(body.ay),
    az: Number(body.az),
    fall_detected: Boolean(body.fall_detected),
    heat_risk: body.heat_risk || 'NORMAL',
    timestamp: body.timestamp || new Date().toISOString(),
    received_at: new Date().toISOString()
  };
}

function getWorkerConnectionStatus() {
  const latest = telemetryHistory[0] || null;

  if (!latest) {
    return {
      worker_connected: false,
      last_seen: null,
      age_ms: null,
      latest: null
    };
  }

  const receivedAt = new Date(latest.received_at).getTime();
  const ageMs = Number.isFinite(receivedAt) ? Date.now() - receivedAt : null;
  const connected = ageMs !== null && ageMs <= WORKER_OFFLINE_AFTER_MS;

  return {
    worker_connected: connected,
    last_seen: latest.received_at,
    age_ms: ageMs,
    latest
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'SafeBand backend running' });
});

app.post('/api/telemetry', (req, res) => {
  const record = normalizeTelemetry(req.body || {});
  telemetryHistory.unshift(record);
  telemetryHistory.splice(MAX_HISTORY);

  console.log('[Telemetry]', JSON.stringify(record));
  res.status(200).json({ ok: true, stored: true, latest: record });
});

app.get('/api/latest', (_req, res) => {
  res.json({ ok: true, latest: telemetryHistory[0] || null });
});

app.get('/api/status', (_req, res) => {
  const status = getWorkerConnectionStatus();

  res.json({
    ok: true,
    ...status
  });
});

app.get('/api/history', (_req, res) => {
  res.json({ ok: true, count: telemetryHistory.length, history: telemetryHistory });
});

app.get('/api/stats', (_req, res) => {
  const latest = telemetryHistory[0] || null;
  const alerts = telemetryHistory.filter((item) => item.fall_detected).length;
  const status = getWorkerConnectionStatus();

  res.json({
    ok: true,
    latest,
    total_records: telemetryHistory.length,
    fall_alerts: alerts,
    worker_connected: status.worker_connected,
    last_seen: status.last_seen,
    age_ms: status.age_ms
  });
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

app.listen(PORT, HOST, () => {
  console.log(`SafeBand backend running on ${HOST}:${PORT}`);
});
