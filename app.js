document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('video');
    const shutter = document.getElementById('shutter');
    const canvas = document.getElementById('capture-canvas');
    const flashEffect = document.getElementById('flash-effect');
    
    // --- IndexedDB for Persistent Storage ---
    const DB_NAME = 'TimeStampGallery';
    const STORE_NAME = 'photos';

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function saveToDB(dataUrl) {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add({ dataUrl, date: Date.now() });
    }

    async function getFromDB() {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        return new Promise((resolve) => {
            tx.objectStore(STORE_NAME).getAll().onsuccess = (e) => resolve(e.target.result);
        });
    }

    const camera = new CameraManager(video);
    const locSvc = new LocationManager();
    
    // 1. Start Camera
    try {
        await camera.start();
    } catch (err) {
        console.error("Failed to initialize camera:", err);
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
        document.getElementById('time-display').innerText = now.toLocaleTimeString();
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
        drawBurnInOverlay(ctx, canvas.width, canvas.height, locSvc);

        // Export as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        await saveToDB(dataUrl);
        savePhoto(dataUrl); // Trigger download
    });

    function drawBurnInOverlay(ctx, w, h, locationData) {
        ctx.save(); // Save state to avoid side effects
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
        const addr = locationData.currentAddress;
        const coords = locationData.currentCoords ? 
            `${locationData.currentCoords.latitude.toFixed(6)}, ${locationData.currentCoords.longitude.toFixed(6)}` : "No GPS Data";
        
        ctx.fillText(addr, padding, h - (barHeight * 0.35));
        ctx.fillText(`GPS: ${coords}`, padding, h - (barHeight * 0.15));

        // Right side: Project Branding (Placeholder)
        ctx.textAlign = "right";
        ctx.fillText("TIMESTAMP PRO CAMERA", w - padding, h - (barHeight * 0.15));
        ctx.restore(); // Restore state
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

    // Gallery Interaction Logic
    const galleryView = document.getElementById('gallery-view');
    const galleryGrid = document.getElementById('gallery-grid');

    document.getElementById('open-gallery').onclick = async () => {
        galleryGrid.innerHTML = '';
        const photos = await getFromDB();
        
        // Show in reverse chronological order
        photos.reverse().forEach(photo => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `<img src="${photo.dataUrl}" alt="Captured Photo">`;
            galleryGrid.appendChild(div);
        });
        
        galleryView.classList.remove('hidden');
    };

    document.getElementById('close-gallery').onclick = () => {
        galleryView.classList.add('hidden');
    };
    
    // Request Orientation Permission (iOS 13+)
    document.body.addEventListener('click', () => { if(typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission(); }, {once: true});
});