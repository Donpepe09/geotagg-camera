class CameraManager {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
        this.facingMode = 'environment'; // Default to rear camera
    }

    async start() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: { ideal: this.facingMode },
                width: { ideal: 4096 }, // Target 4K if available
                height: { ideal: 2160 }
            },
            audio: false
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            await this.video.play();
            return true;
        } catch (error) {
            console.error("Camera access error:", error);
            alert("Could not access camera. Please ensure permissions are granted.");
            return false;
        }
    }

    async switch() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        await this.start();
    }

    getCapabilities() {
        if (!this.stream) return {};
        const track = this.stream.getVideoTracks()[0];
        return track.getCapabilities ? track.getCapabilities() : {};
    }
}

// Export for use in app.js
window.CameraManager = CameraManager;