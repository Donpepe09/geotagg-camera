document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('video');
    const shutter = document.getElementById('shutter');
    const canvas = document.getElementById('capture-canvas');
    const flashEffect = document.getElementById('flash-effect');
    
    const camera = new CameraManager(video);
    const locSvc = new LocationManager();
    
    // 1. Start Camera
    await camera.start();

    // 2. Start Location/Compass
    locSvc.init((data) => {
        document.getElementById('gps-status').innerText = data.currentCoords ? `🛰️ GPS: Locked (${data.currentCoords.accuracy.toFixed(0)}m)` : "🛰️ GPS: Acquiring...";
        document.getElementById('coords-display').innerText = data.currentCoords ? 
            `${data.currentCoords.latitude.toFixed(6)}, ${data.currentCoords.longitude.toFixed(6)}` : "0.0000, 0.0000";
        document.getElementById('address-display').innerText = data.currentAddress;
        
        if (data.currentHeading !== null) {
            document.getElementById('compass-display').innerText = `🧭 ${data.currentHeading.toFixed(0)}°`;
        }
    });

    // 3. Update Real-time Clock
    setInterval(() => {
        const now = new Date();
        document.getElementById('date-display').innerText = now.toLocaleDateString();
        document.getElementById('time-display').innerText = now.toLocaleTimeString();
    }, 1000);

    // 4. Capture Logic (The "Burn-in" Engine)
    shutter.addEventListener('click', async () => {
        // Visual Flash Feedback
        flashEffect.style.transition = 'none';
        flashEffect.style.opacity = '1';
        setTimeout(() => {
            flashEffect.style.transition = 'opacity 0.4s ease-out';
            flashEffect.style.opacity = '0';
        }, 50);

        const ctx = canvas.getContext('2d');
        
        // Match canvas to actual video stream resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the camera frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add metadata overlay to the final image
        drawBurnInOverlay(ctx, canvas.width, canvas.height);

        // Export as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        savePhoto(dataUrl);
    });

    function drawBurnInOverlay(ctx, w, h) {
        const padding = w * 0.03;
        const fontSizeMain = Math.max(24, w * 0.025);
        const fontSizeSub = fontSizeMain * 0.7;

        // Draw Semi-transparent Background Bar at bottom
        const barHeight = h * 0.15;
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, h - barHeight, w, barHeight);

        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        // Top left: Timestamp
        ctx.font = `bold ${fontSizeMain}px Arial`;
        const now = new Date();
        ctx.fillText(now.toLocaleString(), padding, h - (barHeight * 0.6));

        // Bottom left: Location Info
        ctx.font = `${fontSizeSub}px Arial`;
        const addr = document.getElementById('address-display').innerText;
        const coords = document.getElementById('coords-display').innerText;
        ctx.fillText(addr, padding, h - (barHeight * 0.35));
        ctx.fillText(`GPS: ${coords}`, padding, h - (barHeight * 0.15));

        // Right side: Project Branding (Placeholder)
        ctx.textAlign = "right";
        ctx.fillText("TIMESTAMP PRO CAMERA", w - padding, h - (barHeight * 0.15));
    }

    function savePhoto(dataUrl) {
        const link = document.createElement('a');
        link.download = `IMG_TS_${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
    }

    // UI Interactions
    document.getElementById('switch-camera').onclick = () => camera.switch();
    document.getElementById('toggle-grid').onclick = () => {
        document.getElementById('grid-lines').classList.toggle('hidden');
    };
    
    // Request Orientation Permission (iOS 13+)
    document.body.addEventListener('click', () => { if(typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission(); }, {once: true});
});