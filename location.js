class LocationManager {
    constructor() {
        this.currentCoords = null;
        this.currentAddress = "Searching...";
        this.currentHeading = null;
    }

    init(onUpdate) {
        // Track Position
        navigator.geolocation.watchPosition(
            async (pos) => {
                this.currentCoords = pos.coords;
                await this.updateAddress(pos.coords.latitude, pos.coords.longitude);
                onUpdate(this);
            },
            (err) => console.warn("GPS Error:", err),
            { enableHighAccuracy: true }
        );

        // Track Compass (Requires permission on iOS)
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientationabsolute', (e) => {
                if (e.alpha !== null) {
                    this.currentHeading = 360 - e.alpha;
                    onUpdate(this);
                }
            }, true);
        }
    }

    async updateAddress(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            const data = await response.json();
            const a = data.address;
            
            // Format: Barangay, City, Province
            const parts = [
                a.suburb || a.neighbourhood || a.village || a.hamlet,
                a.city || a.town || a.municipality,
                a.state || a.region
            ].filter(Boolean);
            
            this.currentAddress = parts.join(", ") || "Unknown Location";
        } catch (e) {
            this.currentAddress = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
    }
}

// Export for use in app.js
window.LocationManager = LocationManager;