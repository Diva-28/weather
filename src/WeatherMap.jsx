import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Wind Animation Component - Moving particles on map
function WindAnimationOverlay({ windSpeed, windDeg }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const particleCount = 40;
    const newParticles = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        size: 2 + Math.random() * 3
      });
    }
    setParticles(newParticles);
  }, []);

  if (!windSpeed || windSpeed < 1) return null;

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
      zIndex: 1000,
      overflow: "hidden",
      borderRadius: "inherit"
    }}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: "absolute",
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: `rgba(0, 255, 255, ${0.3 + (windSpeed / 30)})`,
            borderRadius: "50%",
            boxShadow: `0 0 ${particle.size * 2}px rgba(0, 255, 255, 0.5)`,
            animation: `windMove ${3 / (windSpeed / 5)}s linear infinite`,
            animationDelay: `${particle.delay}s`
          }}
        />
      ))}
      <style>{`
        @keyframes windMove {
          0% {
            transform: translate(0, 0);
            opacity: 0.8;
          }
          100% {
            transform: translate(80px, 40px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function ChangeMapView({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.lat && coords.lon) {
      map.setView([coords.lat, coords.lon], 10);
    }
  }, [coords, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapClick) return;
    
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    });
    
    return () => {
      map.off('click');
    };
  }, [map, onMapClick]);
  return null;
}

function WeatherMap({ lat, lon, cityName, weatherData, onMapClick, mapLayer = "standard", showWindAnimation = true, unit = "C" }) {
  const mapRef = useRef(null);

  // Get the appropriate tile URL based on selected layer
  const getTileUrl = () => {
    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
    
    switch(mapLayer) {
      case "satellite":
        // Google Hybrid style - Satellite WITH labels/place names
        return "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
      case "satellite_only":
        // Pure satellite without labels
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      case "precipitation":
        return `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      case "clouds":
        return `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      case "wind":
        return `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      case "terrain":
        return "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      default:
        return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    }
  };

  const getAttribution = () => {
    switch(mapLayer) {
      case "satellite":
        return '&copy; <a href="https://maps.google.com/">Google</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      case "satellite_only":
        return '&copy; <a href="https://www.esri.com/">Esri</a>';
      case "precipitation":
      case "clouds":
      case "wind":
        return '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>';
      case "terrain":
        return '&copy; <a href="https://www.opentopomap.org/">OpenTopoMap</a>';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    }
  };

  const getLayerName = () => {
    switch(mapLayer) {
      case "standard": return "🗺️ Standard Map";
      case "satellite": return "🛰️ Satellite (with Labels)";
      case "satellite_only": return "🛰️ Satellite (Pure)";
      case "precipitation": return "🌧️ Precipitation Radar";
      case "clouds": return "☁️ Cloud Cover Map";
      case "wind": return "💨 Wind Pattern Map";
      case "terrain": return "⛰️ Terrain Map";
      default: return "🗺️ Map";
    }
  };

  if (!lat || !lon) {
    return (
      <div 
        style={{
          background: "rgba(0,0,0,0.5)",
          borderRadius: "20px",
          padding: "60px 40px",
          textAlign: "center",
          color: "white",
          minHeight: "300px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🗺️</div>
        <h3>Interactive Weather Map</h3>
        <p>Search for a city to see its location on the map</p>
        <p style={{ fontSize: "12px", opacity: 0.7 }}>Available Layers: Standard | Satellite (with labels) | Rain | Clouds | Wind | Terrain</p>
      </div>
    );
  }

  return (
    <div 
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        background: "#1a1a2e",
        position: "relative"
      }}
    >
      {/* Map Header */}
      <div style={{ 
        padding: "12px 20px", 
        background: "rgba(0,0,0,0.8)", 
        color: "white",
        fontSize: "13px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div>
          <span style={{ fontWeight: "bold" }}>📍 {cityName}</span>
          <span style={{ fontSize: "11px", marginLeft: "10px", opacity: 0.7 }}>
            Lat: {lat.toFixed(4)} | Lon: {lon.toFixed(4)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "15px", fontSize: "11px" }}>
          <span>🖱️ Click map for weather</span>
          <span>🎯 {getLayerName()}</span>
        </div>
      </div>
      
      {/* Map Container with Wind Animation */}
      <div style={{ position: "relative" }}>
        <MapContainer
          center={[lat, lon]}
          zoom={10}
          style={{ height: "450px", width: "100%" }}
          ref={mapRef}
        >
          <ChangeMapView coords={{ lat, lon }} />
          {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
          
          <TileLayer
            attribution={getAttribution()}
            url={getTileUrl()}
          />
          
          <Marker position={[lat, lon]}>
            <Popup>
              <div style={{ textAlign: "center", minWidth: "140px" }}>
                <strong style={{ fontSize: "14px" }}>📍 {cityName}</strong>
                {weatherData && (
                  <>
                    <br />
                    🌡️ <strong>{weatherData.temp}°{unit}</strong>
                    <br />
                    {weatherData.condition}
                    <br />
                    💨 {weatherData.windSpeed} m/s
                    <br />
                    💧 {weatherData.humidity}%
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
        
        {/* Wind Animation Overlay */}
        {showWindAnimation && weatherData && weatherData.windSpeed > 0 && (
          <WindAnimationOverlay 
            windSpeed={weatherData.windSpeed}
            windDeg={weatherData.windDeg}
          />
        )}
      </div>
      
      {/* Map Footer */}
      <div style={{
        padding: "10px 15px",
        background: "rgba(0,0,0,0.8)",
        color: "rgba(255,255,255,0.6)",
        fontSize: "11px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div>
          💡 <strong>Tip:</strong> Click marker for details | Click anywhere on map for weather
        </div>
        <div>
          {getLayerName()}
        </div>
        {showWindAnimation && weatherData && weatherData.windSpeed > 0 && (
          <div style={{ color: "#00ff88" }}>
            🌬️ Wind: {weatherData.windSpeed} m/s
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherMap;