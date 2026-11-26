(() => {
  const mapElement = document.getElementById('alumni-map');
  const leaflet = window.L;
  if (!mapElement || !leaflet?.markerClusterGroup) return;

  // Locations represent cities of current affiliations, not campus or residential addresses.
  const cities = {
    beijing: { name: 'Beijing', coordinates: [39.90, 116.41] },
    durham: { name: 'Durham, NC', coordinates: [36.00, -78.90] },
    irvine: { name: 'Irvine, CA', coordinates: [33.68, -117.83] },
    jinan: { name: 'Jinan', coordinates: [36.67, 117.12] },
    jiujiang: { name: 'Jiujiang', coordinates: [29.71, 115.99] },
    nanjing: { name: 'Nanjing', coordinates: [32.06, 118.80] },
    ningbo: { name: 'Ningbo', coordinates: [29.87, 121.55] },
    qingdao: { name: 'Qingdao', coordinates: [36.07, 120.38] },
    shanghai: { name: 'Shanghai', coordinates: [31.23, 121.47] },
  };
  const roleLabels = {
    masters: 'Master’s Student',
    phd: 'Ph.D. Student',
    postdoc: 'Postdoctoral Fellow',
    assistant: 'Research Assistant',
  };
  const alumniByCity = new Map();
  for (const row of document.querySelectorAll('.alumni-table tr[data-alumni-city][data-alumni-role]')) {
    const { alumniCity, alumniRole } = row.dataset;
    if (!row.id || !Object.hasOwn(cities, alumniCity) || !Object.hasOwn(roleLabels, alumniRole)) continue;

    const alumni = alumniByCity.get(alumniCity) ?? [];
    alumni.push({
      id: row.id,
      name: row.cells[0].textContent.trim(),
      role: alumniRole,
      position: [...row.cells[2].childNodes].map(node => node.textContent.trim()).filter(Boolean).join(' · '),
    });
    alumniByCity.set(alumniCity, alumni);
  }
  if (!alumniByCity.size) return;

  mapElement.closest('.alumni-map-section').hidden = false;
  const map = leaflet.map(mapElement, {
    scrollWheelZoom: false,
    fadeAnimation: false,
    minZoom: .5,
    zoomSnap: .5,
    maxBounds: [[-85.05, -360], [85.05, 360]],
  });
  leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 14,
  }).addTo(map);

  const markers = leaflet.markerClusterGroup({
    animate: false,
    maxClusterRadius: 48,
    showCoverageOnHover: false,
    iconCreateFunction(cluster) {
      const locations = cluster.getAllChildMarkers();
      const count = locations.reduce((total, pin) => total + pin.options.alumniCount, 0);
      cluster.options.title = `${count} alumni across ${locations.length} cities. Zoom in to explore.`;
      return leaflet.divIcon({ className: 'alumni-map-cluster', html: String(count), iconSize: [38, 38] });
    },
  });

  for (const [cityId, alumni] of alumniByCity) {
    const city = cities[cityId];
    const roles = new Set(alumni.map(person => person.role));
    const title = `${city.name} · ${alumni.length} ${alumni.length === 1 ? 'alumnus or alumna' : 'alumni'}`;
    const size = alumni.length > 1 ? 34 : 25;
    const pin = leaflet.marker(city.coordinates, {
      title,
      alumniCount: alumni.length,
      icon: leaflet.divIcon({
        className: 'alumni-map-marker',
        html: alumni.length > 1 ? String(alumni.length) : '',
        iconSize: [size, size],
        popupAnchor: [0, -size / 2],
      }),
    });
    pin.on('add', () => {
      if (roles.size === 1) pin.getElement().dataset.role = alumni[0].role;
      pin.getElement().setAttribute('aria-label', title);
    });

    const popup = document.createElement('div');
    popup.className = 'alumni-map-popup';
    const heading = document.createElement('h3');
    heading.textContent = city.name;
    const list = document.createElement('ul');
    for (const person of alumni) {
      const item = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'alumni-map-dot';
      dot.dataset.role = person.role;
      dot.title = roleLabels[person.role];
      dot.setAttribute('aria-hidden', 'true');
      const link = document.createElement('a');
      link.href = `#${person.id}`;
      link.textContent = person.name;
      link.setAttribute('aria-label', `${person.name}, former ${roleLabels[person.role]}`);
      const position = document.createElement('span');
      position.className = 'alumni-map-position';
      position.textContent = person.position;
      item.append(dot, link, position);
      list.append(item);
    }
    popup.append(heading, list);
    pin.bindPopup(popup, { maxHeight: 250, minWidth: 180, maxWidth: 310 });
    pin.on('popupopen', () => {
      if (document.activeElement === pin.getElement()) popup.querySelector('a').focus({ preventScroll: true });
    });
    markers.addLayer(pin);
  }

  function showAllLocations() {
    map.closePopup();
    map.fitBounds(markers.getBounds(), { padding: [34, 28], maxZoom: 8, animate: false });
  }

  showAllLocations();
  markers.addTo(map);
  document.getElementById('alumni-map-reset').addEventListener('click', showAllLocations);
})();
