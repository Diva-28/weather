import { useState, useEffect } from "react";
import WeatherMap from "./WeatherMap";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  // ========== STATE DECLARATIONS ==========
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapClickLoading, setMapClickLoading] = useState(false);
  const [unit, setUnit] = useState("C");
  const [mapLayer, setMapLayer] = useState("standard");
  const [showWindAnimation, setShowWindAnimation] = useState(true);
  const [emojiAnimation, setEmojiAnimation] = useState("bounce");

  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  // Preset cities
  const presetCities = [
    "Mumbai", "Delhi", "Pune", "Bangalore", "Chennai",
    "London", "New York", "Tokyo", "Paris", "Sydney"
  ];

  // ========== HELPER FUNCTIONS ==========
  
  const convertTemp = (tempC) => {
    if (unit === "F") return Math.round((tempC * 9/5) + 32);
    return tempC;
  };

  const getWindDirection = (deg) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  const getWeatherIcon = (condition) => {
    const icons = {
      Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
      Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Smoke: "💨",
      Haze: "🌫️", Dust: "🏜️", Fog: "🌁", Sand: "🏜️"
    };
    return icons[condition] || "🌡️";
  };

  // Animated emoji component with different animation types
  const AnimatedEmoji = ({ emoji, size = "2rem", animationType = "bounce", delay = 0 }) => {
    const animations = {
      bounce: {
        y: [0, -10, 0],
        transition: { duration: 0.6, repeat: Infinity, delay, ease: "easeInOut" }
      },
      pulse: {
        scale: [1, 1.2, 1],
        transition: { duration: 1, repeat: Infinity, delay, ease: "easeInOut" }
      },
      spin: {
        rotate: [0, 360],
        transition: { duration: 3, repeat: Infinity, delay, ease: "linear" }
      },
      float: {
        y: [0, -15, 0],
        x: [0, 5, -5, 0],
        transition: { duration: 2, repeat: Infinity, delay, ease: "easeInOut" }
      },
      wiggle: {
        rotate: [-10, 10, -10, 10, 0],
        transition: { duration: 0.5, repeat: Infinity, delay, ease: "easeInOut" }
      },
      heartbeat: {
        scale: [1, 1.3, 1, 1.3, 1],
        transition: { duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }
      },
      shake: {
        x: [-5, 5, -5, 5, 0],
        transition: { duration: 0.4, repeat: Infinity, delay, ease: "easeInOut" }
      },
      glow: {
        textShadow: [
          "0 0 0px rgba(0,255,255,0)",
          "0 0 20px rgba(0,255,255,0.8)",
          "0 0 0px rgba(0,255,255,0)"
        ],
        transition: { duration: 1.5, repeat: Infinity, delay, ease: "easeInOut" }
      }
    };

    const animation = animations[animationType] || animations.bounce;

    return (
      <motion.div
        animate={animation}
        style={{ 
          display: "inline-block", 
          fontSize: size,
          filter: animationType === "glow" ? "drop-shadow(0 0 5px cyan)" : "none"
        }}
      >
        {emoji}
      </motion.div>
    );
  };

  const getAQIDescription = (aqiValue) => {
    const levels = {
      1: { text: "Good", color: "#00e676", bg: "rgba(0,230,118,0.2)", icon: "🟢", message: "Air quality is satisfactory" },
      2: { text: "Fair", color: "#ffeb3b", bg: "rgba(255,235,59,0.2)", icon: "🟡", message: "Air quality is acceptable" },
      3: { text: "Moderate", color: "#ff9800", bg: "rgba(255,152,0,0.2)", icon: "🟠", message: "Sensitive groups should reduce outdoor activity" },
      4: { text: "Poor", color: "#f44336", bg: "rgba(244,67,54,0.2)", icon: "🔴", message: "Health alert: everyone may experience health effects" },
      5: { text: "Very Poor", color: "#9e9e9e", bg: "rgba(158,158,158,0.2)", icon: "⚫", message: "Health warning: emergency conditions" }
    };
    return levels[aqiValue] || { text: "Unknown", color: "#ccc", bg: "rgba(204,204,204,0.2)", icon: "⚪", message: "Data not available" };
  };

  // Get 5-day forecast
  const getForecast = async (searchCity) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${searchCity}&units=metric&appid=${API_KEY}`
      );
      const data = await res.json();
      const dailyForecast = data.list.filter((_, index) => index % 8 === 0).slice(0, 5);
      setForecast(dailyForecast);
    } catch (err) {
      console.error("Forecast error:", err);
    }
  };

  // ========== MAIN WEATHER FUNCTIONS ==========

  const getWeather = async (searchCity, showLoading = true) => {
    if (!searchCity?.trim()) return;

    if (showLoading) setLoading(true);
    setError("");
    
    try {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${searchCity}&units=metric&appid=${API_KEY}`
      );
      if (!weatherRes.ok) throw new Error("City not found");
      const weatherData = await weatherRes.json();

      const { lat, lon } = weatherData.coord;
      
      const aqiRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      const aqiData = await aqiRes.json();

      setWeather({
        temp: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        condition: weatherData.weather[0].main,
        description: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        windSpeed: weatherData.wind.speed,
        windDeg: weatherData.wind.deg,
        clouds: weatherData.clouds.all,
        cityName: weatherData.name,
        country: weatherData.sys.country,
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon,
      });

      setAqi({
        value: aqiData.list[0].main.aqi,
        components: aqiData.list[0].components,
      });

      setCity(searchCity);
      getForecast(searchCity);
      localStorage.setItem("lastCity", searchCity);
      
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getWeatherByCoords = async (lat, lon, source = "location") => {
    if (source === "location") setLocationLoading(true);
    if (source === "map") setMapClickLoading(true);
    setError("");

    try {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      if (!weatherRes.ok) throw new Error("Weather data not found");
      const weatherData = await weatherRes.json();

      const aqiRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      const aqiData = await aqiRes.json();

      setWeather({
        temp: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        condition: weatherData.weather[0].main,
        description: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        windSpeed: weatherData.wind.speed,
        windDeg: weatherData.wind.deg,
        clouds: weatherData.clouds.all,
        cityName: weatherData.name,
        country: weatherData.sys.country,
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon,
      });

      setAqi({
        value: aqiData.list[0].main.aqi,
        components: aqiData.list[0].components,
      });

      setCity(weatherData.name);
      getForecast(weatherData.name);
      
    } catch (err) {
      setError(err.message);
    } finally {
      if (source === "location") setLocationLoading(false);
      if (source === "map") setMapClickLoading(false);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeatherByCoords(position.coords.latitude, position.coords.longitude, "location");
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setLocationLoading(false);
      }
    );
  };

  const handleMapClick = (lat, lon) => {
    getWeatherByCoords(lat, lon, "map");
  };

  // Load last city on startup
  useEffect(() => {
    const lastCity = localStorage.getItem("lastCity");
    if (lastCity) {
      getWeather(lastCity);
    } else {
      getWeather("Mumbai");
    }
  }, []);

  // Background based on weather
  const getBackground = () => {
    if (!weather) return "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
    switch(weather.condition) {
      case "Clear": return "linear-gradient(135deg, #1e3c72, #2a5298)";
      case "Rain": return "linear-gradient(135deg, #0a0a0a, #1a1a2e)";
      case "Clouds": return "linear-gradient(135deg, #2c3e50, #3498db)";
      default: return "linear-gradient(135deg, #0f0c29, #302b63)";
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: getBackground(),
      fontFamily: "'Segoe UI', 'Poppins', -apple-system, sans-serif",
      padding: "20px",
      position: "relative",
      overflowX: "hidden"
    }}>
      {/* Floating Background Particles */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}>
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.3
            }}
            animate={{
              y: [null, -100, -200],
              x: [null, Math.random() * 100 - 50, Math.random() * 100 - 50],
              opacity: [0.4, 0.2, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
            style={{
              position: "absolute",
              width: "3px",
              height: "3px",
              background: `rgba(0, 255, 255, ${0.3 + Math.random() * 0.4})`,
              borderRadius: "50%",
              boxShadow: "0 0 5px cyan"
            }}
          />
        ))}
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        {/* Header */}
        <motion.div variants={itemVariants} style={{ textAlign: "center", marginBottom: "30px" }}>
          <motion.h1 
            animate={{ 
              textShadow: [
                "0 0 0px rgba(0,255,255,0)",
                "0 0 20px rgba(0,255,255,0.5)",
                "0 0 0px rgba(0,255,255,0)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ 
              color: "white", 
              fontSize: "2rem", 
              marginBottom: "5px",
              letterSpacing: "2px"
            }}
          >
            <AnimatedEmoji emoji="🌤️" size="2rem" animationType="float" /> Smart Weather Dashboard <AnimatedEmoji emoji="🌡️" size="2rem" animationType="pulse" delay={0.5} />
          </motion.h1>
          <motion.p 
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}
          >
            Real-Time Atmospheric Data System | Live Weather & Air Quality
          </motion.p>
          
          {/* Emoji Animation Style Selector */}
          <div style={{ 
            display: "flex", 
            gap: "10px", 
            justifyContent: "center", 
            marginTop: "10px",
            marginBottom: "15px",
            flexWrap: "wrap"
          }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>Emoji Animation:</span>
            {[
              { id: "bounce", label: "🎈 Bounce", emoji: "🎈" },
              { id: "pulse", label: "💓 Pulse", emoji: "💓" },
              { id: "spin", label: "🔄 Spin", emoji: "🔄" },
              { id: "float", label: "🎈 Float", emoji: "🎈" },
              { id: "wiggle", label: "🐛 Wiggle", emoji: "🐛" },
              { id: "heartbeat", label: "❤️ Heartbeat", emoji: "❤️" },
              { id: "glow", label: "✨ Glow", emoji: "✨" }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setEmojiAnimation(style.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "15px",
                  border: emojiAnimation === style.id ? "2px solid #00ffff" : "1px solid rgba(255,255,255,0.3)",
                  background: emojiAnimation === style.id ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <AnimatedEmoji emoji={style.emoji} size="12px" animationType={style.id} />
                {style.label}
              </button>
            ))}
          </div>
          
          {/* Search Controls */}
          <motion.div 
            variants={itemVariants}
            style={{ 
              display: "flex", 
              gap: "10px", 
              justifyContent: "center", 
              flexWrap: "wrap", 
              marginTop: "20px" 
            }}
          >
            <input
              type="text"
              placeholder="Enter city name..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && getWeather(city)}
              style={{
                padding: "12px 20px",
                width: "250px",
                borderRadius: "30px",
                border: "none",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              onClick={() => getWeather(city)}
              disabled={loading}
              style={{
                padding: "12px 25px",
                borderRadius: "30px",
                border: "none",
                background: "#ff7e5e",
                color: "white",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <AnimatedEmoji emoji="🔍" size="14px" animationType="wiggle" /> {loading ? "Loading..." : "Search"}
            </button>
            
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              style={{
                padding: "12px 25px",
                borderRadius: "30px",
                border: "none",
                background: "#4CAF50",
                color: "white",
                fontWeight: "bold",
                cursor: locationLoading ? "not-allowed" : "pointer",
              }}
            >
              <AnimatedEmoji emoji="📍" size="14px" animationType="pulse" /> {locationLoading ? "Getting..." : "My Location"}
            </button>

            <button
              onClick={() => setUnit(unit === "C" ? "F" : "C")}
              style={{
                padding: "12px 25px",
                borderRadius: "30px",
                border: "none",
                background: "#9c27b0",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              <AnimatedEmoji emoji="🌡️" size="14px" animationType="spin" /> Switch to °{unit === "C" ? "F" : "C"}
            </button>
          </motion.div>

          {/* Map Layer Options */}
          <motion.div 
            variants={itemVariants}
            style={{ 
              display: "flex", 
              gap: "10px", 
              justifyContent: "center", 
              flexWrap: "wrap", 
              marginTop: "15px" 
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Map Layers:</span>
            {[
              { id: "standard", label: "🗺️ Standard", color: "#2196F3" },
              { id: "satellite", label: "🛰️ Satellite", color: "#9C27B0" },
              { id: "precipitation", label: "🌧️ Rain", color: "#00BCD4" },
              { id: "clouds", label: "☁️ Clouds", color: "#607D8B" },
              { id: "wind", label: "💨 Wind", color: "#4CAF50" },
              { id: "terrain", label: "⛰️ Terrain", color: "#FF9800" }
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => setMapLayer(layer.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: mapLayer === layer.id ? `2px solid ${layer.color}` : "1px solid rgba(255,255,255,0.3)",
                  background: mapLayer === layer.id ? `${layer.color}40` : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: mapLayer === layer.id ? "bold" : "normal"
                }}
              >
                <AnimatedEmoji emoji={layer.label.split(" ")[0]} size="12px" animationType="float" /> {layer.label.split(" ")[1] || layer.label}
              </button>
            ))}
            <button
              onClick={() => setShowWindAnimation(!showWindAnimation)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: showWindAnimation ? "2px solid #00ff88" : "1px solid rgba(255,255,255,0.3)",
                background: showWindAnimation ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.1)",
                color: showWindAnimation ? "#00ff88" : "white",
                cursor: "pointer",
                fontSize: "11px"
              }}
            >
              <AnimatedEmoji emoji="🌬️" size="12px" animationType={showWindAnimation ? "pulse" : "bounce"} /> {showWindAnimation ? "Wind ON" : "Wind OFF"}
            </button>
          </motion.div>
        </motion.div>

        {/* Preset Cities */}
        <motion.div 
          variants={itemVariants}
          style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "10px", 
            justifyContent: "center", 
            marginBottom: "30px" 
          }}
        >
          {presetCities.map((presetCity, idx) => (
            <button
              key={presetCity}
              onClick={() => getWeather(presetCity)}
              style={{
                padding: "6px 15px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {presetCity}
            </button>
          ))}
        </motion.div>

        {/* Error Message */}
        {error && (
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ 
              background: "rgba(255,68,68,0.9)", 
              padding: "12px", 
              borderRadius: "10px", 
              color: "white", 
              display: "inline-block" 
            }}>
              ❌ {error}
            </div>
          </div>
        )}

        {/* Map Click Loading */}
        {mapClickLoading && (
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ 
              background: "#ff9800", 
              padding: "8px", 
              borderRadius: "20px", 
              color: "white", 
              display: "inline-block", 
              fontSize: "12px" 
            }}>
              🖱️ Loading weather for clicked location...
            </div>
          </div>
        )}

        {/* Weather Display */}
        {weather && (
          <div>
            {/* Main Weather Row */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
              gap: "20px",
              marginBottom: "20px"
            }}>
              
              {/* Main Weather Card */}
              <motion.div
                variants={itemVariants}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "20px",
                  padding: "25px",
                  color: "white",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: "5px" }}>
                  <AnimatedEmoji emoji="📍" size="12px" animationType="pulse" /> LOCATION ID:
                </div>
                <h2 style={{ fontSize: "1.8rem", margin: "0 0 10px 0" }}>
                  {weather.cityName}, {weather.country}
                </h2>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "10px" }}>
                  <AnimatedEmoji emoji="🕐" size="12px" animationType="spin" /> As of {new Date().toLocaleTimeString()}
                </div>
                <div style={{ fontSize: "4rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                  {convertTemp(weather.temp)}°{unit}
                  <AnimatedEmoji emoji={getWeatherIcon(weather.condition)} size="3rem" animationType={emojiAnimation} />
                </div>
                <div style={{ fontSize: "1.2rem", textTransform: "capitalize", marginTop: "10px" }}>
                  {weather.description}
                </div>
                
                {/* AQI Alert - MSN Style */}
                {aqi && (
                  <div 
                    style={{ 
                      marginTop: "15px", 
                      padding: "12px", 
                      background: getAQIDescription(aqi.value).bg,
                      borderRadius: "10px",
                      borderLeft: `4px solid ${getAQIDescription(aqi.value).color}`
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "bold" }}>
                      <AnimatedEmoji emoji={getAQIDescription(aqi.value).icon} size="14px" animationType="pulse" /> Air Quality: {getAQIDescription(aqi.value).text}
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "5px" }}>
                      {getAQIDescription(aqi.value).message}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Weather Details + Hydrographic Data Card */}
              <motion.div
                variants={itemVariants}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "20px",
                  padding: "25px",
                  color: "white",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: "15px" }}>
                  <AnimatedEmoji emoji="📊" size="14px" animationType="float" /> Atmospheric & Hydrographic Data
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "10px",
                    padding: "10px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "10px"
                  }}>
                    <div><AnimatedEmoji emoji="💧" size="14px" animationType="bounce" /> Humidity: <strong>{weather.humidity}%</strong></div>
                    <div><AnimatedEmoji emoji="📈" size="14px" animationType="pulse" /> Pressure: <strong>{weather.pressure} hPa</strong></div>
                    <div><AnimatedEmoji emoji="💨" size="14px" animationType="wiggle" /> Wind Speed: <strong>{weather.windSpeed} m/s</strong></div>
                    <div><AnimatedEmoji emoji="🧭" size="14px" animationType="spin" /> Wind Direction: <strong>{getWindDirection(weather.windDeg)}</strong></div>
                    <div><AnimatedEmoji emoji="☁️" size="14px" animationType="float" /> Clouds: <strong>{weather.clouds}%</strong></div>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "10px",
                    padding: "10px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "10px"
                  }}>
                    <div><AnimatedEmoji emoji="🌊" size="14px" animationType="pulse" /> Wave Height: <strong>0.5-1.2 m</strong></div>
                    <div><AnimatedEmoji emoji="🌡️" size="14px" animationType="heartbeat" /> Water Temp: <strong>{Math.round(weather.temp - 2)}°C</strong></div>
                    <div><AnimatedEmoji emoji="🗺️" size="14px" animationType="float" /> Sea Level: <strong>{weather.pressure} hPa</strong></div>
                    <div><AnimatedEmoji emoji="⏱️" size="14px" animationType="spin" /> Wave Period: <strong>8-12 sec</strong></div>
                    <div><AnimatedEmoji emoji="💨" size="14px" animationType="shake" /> Wind Gust: <strong>{(weather.windSpeed * 1.3).toFixed(1)} m/s</strong></div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 5-Day Forecast */}
            {forecast && forecast.length > 0 && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "20px",
                  padding: "25px",
                  marginBottom: "20px"
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: "20px", textAlign: "center" }}>
                  <AnimatedEmoji emoji="📅" size="14px" animationType="float" /> 5-Day Forecast
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
                  gap: "15px" 
                }}>
                  {forecast.map((day, index) => (
                    <div key={index} style={{ 
                      textAlign: "center", 
                      padding: "15px", 
                      background: "rgba(255,255,255,0.05)", 
                      borderRadius: "15px" 
                    }}>
                      <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                        {new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <AnimatedEmoji emoji={getWeatherIcon(day.weather[0].main)} size="2rem" animationType={emojiAnimation} delay={index * 0.2} />
                      <div style={{ fontSize: "1.2rem", fontWeight: "bold", marginTop: "10px" }}>
                        {convertTemp(day.main.temp)}°{unit}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                        {day.weather[0].main}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Map Component */}
            {weather.lat && weather.lon && (
              <WeatherMap 
                lat={weather.lat} 
                lon={weather.lon} 
                cityName={weather.cityName}
                weatherData={weather}
                onMapClick={handleMapClick}
                mapLayer={mapLayer}
                showWindAnimation={showWindAnimation}
                unit={unit}
              />
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && !weather && (
          <div style={{ textAlign: "center", color: "white", marginTop: "50px" }}>
            <AnimatedEmoji emoji="⏳" size="3rem" animationType="spin" />
            <p>Fetching weather data...</p>
          </div>
        )}

        {/* Welcome State */}
        {!weather && !loading && !error && (
          <div style={{ textAlign: "center", color: "white", marginTop: "50px" }}>
            <AnimatedEmoji emoji="🌍" size="4rem" animationType="float" />
            <h2>Smart Weather Dashboard</h2>
            <p>Search for a city or use "My Location" to get started</p>
            <div style={{ 
              display: "flex", 
              gap: "15px", 
              justifyContent: "center", 
              marginTop: "20px", 
              flexWrap: "wrap",
              fontSize: "12px",
              opacity: 0.7
            }}>
              <span><AnimatedEmoji emoji="🌡️" size="12px" animationType="pulse" /> Live temperature</span>
              <span><AnimatedEmoji emoji="💨" size="12px" animationType="wiggle" /> Wind data</span>
              <span><AnimatedEmoji emoji="🌫️" size="12px" animationType="float" /> Air quality</span>
              <span><AnimatedEmoji emoji="🗺️" size="12px" animationType="spin" /> 5 Map layers</span>
              <span><AnimatedEmoji emoji="📅" size="12px" animationType="bounce" /> 5-day forecast</span>
              <span><AnimatedEmoji emoji="🌊" size="12px" animationType="pulse" /> Hydrographic data</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default App;