document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('video');
    const shutter = document.getElementById('shutter');
    const canvas = document.getElementById('capture-canvas');
    const flashEffect = document.getElementById('flash-effect');
    
    // Settings Elements
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    
    const camera = new CameraManager(video);
    const locSvc = new LocationManager();

    let settings = {
        timeFormat: '12h',
        fontColor: '#ffffff',
        opacity: 0.4,
        projectName: '',
        inspector: ''
    };
    
    // 1. Start Camera
    try {
        await camera.start();
    } catch (err) {
        console.error("Failed to initialize camera:", err);
    }

    // Load Settings
    const savedSettings = localStorage.getItem('tsp_settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        applyLiveSettings();
    }

    function updateSettingsUI() {
        document.getElementById('setting-time-format').value = settings.timeFormat;
        document.getElementById('setting-font-color').value = settings.fontColor;
        document.getElementById('setting-opacity').value = settings.opacity;
        document.getElementById('setting-project-name').value = settings.projectName;
        document.getElementById('setting-inspector').value = settings.inspector;
    }

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
        
        const timeOptions = { 
            hour12: settings.timeFormat === '12h',
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        };
        document.getElementById('time-display').innerText = now.toLocaleTimeString([], timeOptions);
    }, 1000);

    // 4. Capture Logic (The "Burn-in" Engine)
    shutter.addEventListener('click', async () => {
        if (!video.videoWidth) {
            console.warn("Video stream not ready for capture.");
            return;
        }

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
        drawBurnInOverlay(ctx, canvas.width, canvas.height, locSvc, settings);

        // Export as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        savePhoto(dataUrl);
    });

    function drawBurnInOverlay(ctx, w, h, locationData, currentSettings) {
        ctx.save(); // Save state to avoid side effects
        const padding = w * 0.03;
        const fontSizeMain = Math.max(24, w * 0.025);
        const fontSizeSub = fontSizeMain * 0.7;

        // Draw Semi-transparent Background Bar at bottom
        const barHeight = h * 0.15;
        ctx.fillStyle = `rgba(0, 0, 0, ${currentSettings.opacity})`;
        ctx.fillRect(0, h - barHeight, w, barHeight);

        ctx.fillStyle = currentSettings.fontColor;
        ctx.textAlign = "left";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        // Top left: Timestamp
        ctx.font = `bold ${fontSizeMain}px Arial`;
        const now = new Date();
        const timeStr = now.toLocaleString([], {
            hour12: currentSettings.timeFormat === '12h',
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        ctx.fillText(timeStr, padding, h - (barHeight * 0.6));

        // Bottom left: Location Info
        ctx.font = `${fontSizeSub}px Arial`;
        const addr = locationData.currentAddress;
        const coords = locationData.currentCoords ? 
            `${locationData.currentCoords.latitude.toFixed(6)}, ${locationData.currentCoords.longitude.toFixed(6)}` : "No GPS Data";
        
        ctx.fillText(addr, padding, h - (barHeight * 0.35));
        ctx.fillText(`GPS: ${coords}`, padding, h - (barHeight * 0.15));

        // Right side: Project Branding (Placeholder)
        ctx.textAlign = "right";
        const brandText = currentSettings.projectName || "TIMESTAMP PRO CAMERA";
        ctx.fillText(brandText, w - padding, h - (barHeight * 0.35));
        
        if (currentSettings.inspector) {
            ctx.fillText(`Inspector: ${currentSettings.inspector}`, w - padding, h - (barHeight * 0.15));
        }
        ctx.restore(); // Restore state
    }

    function savePhoto(dataUrl) {
        const link = document.createElement('a');
        link.download = `IMG_TS_${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
    }

    // UI Interactions
    openSettingsBtn.onclick = () => {
        updateSettingsUI();
        settingsModal.classList.remove('hidden');
    };
    closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');
    
    saveSettingsBtn.onclick = () => {
        settings = {
            timeFormat: document.getElementById('setting-time-format').value,
            fontColor: document.getElementById('setting-font-color').value,
            opacity: parseFloat(document.getElementById('setting-opacity').value),
            projectName: document.getElementById('setting-project-name').value,
            inspector: document.getElementById('setting-inspector').value
        };
        
        localStorage.setItem('tsp_settings', JSON.stringify(settings));
        applyLiveSettings();
        settingsModal.classList.add('hidden');
    };

    function applyLiveSettings() {
        const overlayBottom = document.querySelector('.overlay-bottom');
        if (overlayBottom) {
            overlayBottom.style.background = `rgba(0, 0, 0, ${settings.opacity})`;
        }
        document.querySelectorAll('.primary-text, .secondary-text').forEach(el => {
            el.style.color = settings.fontColor;
        });
    }

    document.getElementById('switch-camera').onclick = () => camera.switch();
    document.getElementById('toggle-grid').onclick = () => {
        document.getElementById('grid-lines').classList.toggle('hidden');
    };
    
    // Request Orientation Permission (iOS 13+)
    document.body.addEventListener('click', () => { if(typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission(); }, {once: true});
});