import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { useState, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-ant-path";
import "leaflet-curve";
import "./App.css";

// === ICONS ===
const droneIcon = new L.Icon({
  iconUrl: process.env.PUBLIC_URL + "/icons/drone.png",
  iconSize: [45, 45],
});
const baseIcon = new L.Icon({
  iconUrl: process.env.PUBLIC_URL + "/icons/base1.png",
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});
const villageIcon = new L.Icon({
  iconUrl: process.env.PUBLIC_URL + "/icons/village.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// === DATA BASE & DESA ===
const baseStations = [
  { id: 1, name: "Base Alpha", coords: [-4.0, 138.7] },
  { id: 2, name: "Base Bravo", coords: [-4.2, 138.9] },
  { id: 3, name: "Base Charlie", coords: [-4.3, 138.6] },
  { id: 4, name: "Base Delta", coords: [-4.4, 138.8] },
  { id: 5, name: "Base Echo", coords: [-4.1, 138.5] },
];

const desaByBase = {
  1: [
    { name: "Desa A", coords: [-4.02, 138.72] },
    { name: "Desa B", coords: [-4.03, 138.69] },
    { name: "Desa C", coords: [-4.01, 138.71] },
  ],
  2: [
    { name: "Desa D", coords: [-4.22, 138.92] },
    { name: "Desa E", coords: [-4.21, 138.88] },
    { name: "Desa F", coords: [-4.23, 138.91] },
  ],
  3: [
    { name: "Desa G", coords: [-4.32, 138.62] },
    { name: "Desa H", coords: [-4.31, 138.64] },
    { name: "Desa I", coords: [-4.33, 138.61] },
  ],
  4: [
    { name: "Desa J", coords: [-4.42, 138.82] },
    { name: "Desa K", coords: [-4.41, 138.80] },
    { name: "Desa L", coords: [-4.43, 138.81] },
  ],
  5: [
    { name: "Desa M", coords: [-4.12, 138.52] },
    { name: "Desa N", coords: [-4.11, 138.50] },
    { name: "Desa O", coords: [-4.13, 138.51] },
  ],
};

const baseColors = ["#ff4d4d", "#4d94ff", "#00cc99", "#ffa31a", "#aa66cc"];
const weatherOptions = ["☀ Cerah", "🌧 Hujan", "☁ Mendung", "🌩 Badai"];

// === BUAT JALUR MELENGKUNG ===
function createCurve(start, end) {
  const offsetLat = (start[0] + end[0]) / 2 + 0.03;
  const offsetLng = (start[1] + end[1]) / 2 + 0.03;
  return ["M", start, "Q", [offsetLat, offsetLng], end];
}

function DroneRoutes({ drones, map }) {
  useEffect(() => {
    if (!map) return;
    const layers = [];

    drones.forEach((drone) => {
      const base = baseStations.find((b) => b.id === drone.baseId);
      if (!base) return;

      // Jalur utama (garis melengkung)
      const curvePath = createCurve(base.coords, drone.target.coords);
      const curveLine = L.curve(curvePath, {
        color: baseColors[drone.baseId - 1],
        weight: 2,
        opacity: 0.6,
      }).addTo(map);
      layers.push(curveLine);

      // Animasi garis (antPath)
      const antPathLine = L.polyline.antPath([base.coords, drone.target.coords], {
        delay: 600,
        dashArray: [10, 20],
        weight: 3,
        color: baseColors[drone.baseId - 1],
        pulseColor: "#fff",
        opacity: 0.8,
      }).addTo(map);
      layers.push(antPathLine);
    });

    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
    };
  }, [drones, map]);

  return null;
}


// === KOMPONEN UNTUK ZOOM OTOMATIS ===
function FlyToBase({ selectedBase }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBase) {
      map.flyTo(selectedBase.coords, 12, { duration: 1.5 });
    }
  }, [selectedBase, map]);
  return null;
}

export default function App() {
  const [map, setMap] = useState(null);
  const [selectedBase, setSelectedBase] = useState(null);
  const [weather, setWeather] = useState({});

  const [drones, setDrones] = useState(() => {
    let arr = [];
    baseStations.forEach((base, idx) => {
      for (let i = 1; i <= 3; i++) {
        arr.push({
          id: `${base.id}-${i}`,
          baseId: base.id,
          pos: base.coords,
          target: desaByBase[base.id][Math.floor(Math.random() * 3)],
          battery: 100,
          color: baseColors[idx],
        });
      }
    });
    return arr;
  });

  // === ANIMASI DRONE BERGERAK ===
  useEffect(() => {
    const interval = setInterval(() => {
      setDrones((prev) =>
        prev.map((drone) => {
          const [lat, lng] = drone.pos;
          const [tLat, tLng] = drone.target.coords;
          const dist = Math.sqrt((tLat - lat) ** 2 + (tLng - lng) ** 2);

          if (dist < 0.002) {
            return {
              ...drone,
              target: desaByBase[drone.baseId][Math.floor(Math.random() * 3)],
              battery: drone.battery > 5 ? drone.battery - 5 : 100,
            };
          }

          let step = 0.01;
          return {
            ...drone,
            pos: [lat + (tLat - lat) * step, lng + (tLng - lng) * step],
            battery: drone.battery > 0 ? drone.battery - 0.05 : 100,
          };
        })
      );
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // === CUACA UPDATE DUMMY ===
  useEffect(() => {
    const interval = setInterval(() => {
      let newWeather = {};
      baseStations.forEach((b) => {
        newWeather[b.id] =
          weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
      });
      setWeather(newWeather);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // === KETIKA KLIK BASE STATION ===
  const handleBaseClick = (base) => {
    setSelectedBase(base);
  };

  return (
    <div className="app-container">
      {/* === SIDEBAR KIRI === */}
      <div className="sidebar-left">
        <h2>🛰 Base Stations</h2>
        {baseStations.map((base) => (
          <div
            key={base.id}
            className={`base-card ${selectedBase?.id === base.id ? "active" : ""}`}
            onClick={() => handleBaseClick(base)}
          >
            <h3 style={{ color: baseColors[base.id - 1] }}>{base.name}</h3>
            <p>🚁 Drone aktif: {drones.filter((d) => d.baseId === base.id).length}</p>
            <p>🌦 {weather[base.id] || "Cerah"}</p>
          </div>
        ))}
      </div>

      {/* === MAP === */}
      <div className="map-container">
        <MapContainer
          center={[-4.1, 138.7]}
          zoom={9}
          style={{ height: "100%", width: "100%" }}
          whenCreated={setMap}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* 🔥 Tambah komponen flyToBase */}
          {selectedBase && <FlyToBase selectedBase={selectedBase} />}

          {/* 🔥 Tambah jalur drone */}
          <DroneRoutes drones={drones} map={map} />

          {/* Base Stations */}
          {baseStations.map((base) => (
            <Marker key={base.id} position={base.coords} icon={baseIcon}>
              <Tooltip>{base.name}</Tooltip>
            </Marker>
          ))}

          {/* Desa */}
          {Object.values(desaByBase).flat().map((desa, idx) => (
            <Marker key={idx} position={desa.coords} icon={villageIcon}>
              <Tooltip>{desa.name}</Tooltip>
            </Marker>
          ))}

          {/* Drone markers */}
          {drones.map((drone) => (
            <Marker key={drone.id} position={drone.pos} icon={droneIcon}>
              <Tooltip>Drone {drone.id}</Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* === SIDEBAR KANAN === */}
      <div className={`sidebar-right ${selectedBase ? "show" : ""}`}>
        {selectedBase ? (
          <>
            <div className="detail-header">
              <h3>📡 {selectedBase.name}</h3>
              <button className="close-btn" onClick={() => setSelectedBase(null)}>❌</button>
            </div>

            <p>Koordinat: {selectedBase.coords.join(", ")}</p>
            <h4>🚁 Drone di Base:</h4>
            {drones
              .filter((d) => d.baseId === selectedBase.id)
              .map((d) => (
                <div key={d.id} className="drone-detail">
                  <p>Drone {d.id} → {d.target.name}</p>
                  <p>🔋 Battery: {d.battery.toFixed(0)}%</p>
                  <p>📍 Posisi: {d.pos[0].toFixed(3)}, {d.pos[1].toFixed(3)}</p>
                </div>
              ))}
          </>
        ) : (
          <p>👆 Klik Base Station untuk lihat detail</p>
        )}
      </div>
    </div>
  );
}
