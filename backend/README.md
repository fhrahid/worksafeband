# SafeBand Dashboard Backend

This folder contains the Node.js backend and dashboard for the SafeBand ESP32 wearable. It can run locally or be deployed to Render from GitHub.

## What it does

- Serves a live dashboard locally or on Render
- Accepts ESP32 telemetry with `POST /api/telemetry`
- Stores the latest readings in memory
- Shows temperature, humidity, motion, heat risk, and fall alerts in the browser

## Install

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
```

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Deploy to Render

1. Push this `backend` folder to GitHub.
2. In Render, create a new Web Service from that GitHub repo.
3. Set the root directory to `backend`.
4. Use the included `render.yaml`, or set manually:
	- Build Command: `npm install`
	- Start Command: `npm start`
5. Deploy.

Render will give you a public URL such as `https://your-app.onrender.com`.

## ESP32 to cloud server

When you deploy to Render, update `BACKEND_URL` in `src/main.cpp` to your Render URL, for example:

```text
https://your-app.onrender.com/api/telemetry
```

The ESP32 should post to the cloud URL, not your PC's LAN IP, when you are using Render.

## ESP32 connection

Your ESP32 cannot send requests to `localhost` because `localhost` means the ESP32 itself.

Use your computer's LAN IP address instead, for example:

```text
http://192.168.1.50:3000/api/telemetry
```

Make sure:

- The ESP32 and your PC are on the same WiFi network
- Windows Firewall allows inbound traffic on port `3000`
- The backend URL in `src/main.cpp` points to your PC's LAN IP

## API fields

The ESP32 posts JSON with these fields:

- `worker_id`
- `device_type`
- `temperature`
- `humidity`
- `ax`
- `ay`
- `az`
- `fall_detected`
- `heat_risk`
- `timestamp`

## Uploading the ESP32 code

In the PlatformIO project folder, run:

```bash
pio run --target upload
```

If `pio` is not on PATH, use the PlatformIO terminal inside VS Code or install PlatformIO CLI.

Before uploading, set:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `BACKEND_URL`

in `src/main.cpp`.
