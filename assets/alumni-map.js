(() => {
  const mapElement = document.getElementById('alumni-map');
  const chinaMapElement = document.getElementById('alumni-china-map');
  const leaflet = window.L;
  if (!mapElement || !chinaMapElement || !leaflet?.markerClusterGroup) return;
  const baseUrl = new URL('.', document.currentScript.src);

  // Locations represent cities of current affiliations, not campus or residential addresses.
  const cities = {
    beijing: { name: 'Beijing', coordinates: [39.90, 116.41], inChina: true },
    durham: { name: 'Durham, NC', coordinates: [36.00, -78.90] },
    irvine: { name: 'Irvine, CA', coordinates: [33.68, -117.83] },
    jinan: { name: 'Jinan', coordinates: [36.67, 117.12], inChina: true },
    jiujiang: { name: 'Jiujiang', coordinates: [29.71, 115.99], inChina: true },
    nanjing: { name: 'Nanjing', coordinates: [32.06, 118.80], inChina: true },
    ningbo: { name: 'Ningbo', coordinates: [29.87, 121.55], inChina: true },
    qingdao: { name: 'Qingdao', coordinates: [36.07, 120.38], inChina: true },
    shanghai: { name: 'Shanghai', coordinates: [31.23, 121.47], inChina: true },
  };
  // The first eligible role is the highest one shown on the map.
  const roleLabels = {
    postdoc: 'Postdoctoral Fellow',
    phd: 'Ph.D. Student',
    masters: 'Master’s Student',
    visiting: 'Visiting Member',
  };
  const rolePriority = Object.keys(roleLabels);
  const alumniByCity = new Map();
  for (const row of document.querySelectorAll('.alumni-table tr[data-alumni-city][data-alumni-role]')) {
    const { alumniCity, alumniRole } = row.dataset;
    const formerRoles = alumniRole.split(/\s+/);
    const role = rolePriority.find(candidate => formerRoles.includes(candidate));
    if (!row.id || !Object.hasOwn(cities, alumniCity) || !role) continue;

    const alumni = alumniByCity.get(alumniCity) ?? [];
    alumni.push({
      id: row.id,
      name: row.cells[0].textContent.trim(),
      role,
      position: [...row.cells[2].childNodes].map(node => node.textContent.trim()).filter(Boolean).join(' · '),
    });
    alumniByCity.set(alumniCity, alumni);
  }
  if (!alumniByCity.size) return;

  function createMarker(city, alumni) {
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
    pin.bindPopup(popup, { maxHeight: 170, minWidth: 175, maxWidth: 260 });
    pin.on('popupopen', () => {
      if (document.activeElement === pin.getElement()) popup.querySelector('a').focus({ preventScroll: true });
    });
    return pin;
  }

  let outlineRequest;
  const webgl = leaflet.maplibreGL && document.createElement('canvas').getContext('webgl2');
  webgl?.getExtension('WEBGL_lose_context')?.loseContext();

  function addBasemap(map, getLabelVisibility) {
    function showOutline() {
      outlineRequest ??= fetch(new URL('alumni-land.json', baseUrl)).then(response => {
        if (!response.ok) throw new Error(`Land outline request failed (${response.status})`);
        return response.json();
      });
      outlineRequest.then(outline => {
        leaflet.geoJSON(outline, {
          pane: 'tilePane', interactive: false, stroke: false, fillColor: '#eef1d4', fillOpacity: 1,
          attribution: '<a href="https://www.naturalearthdata.com/">Natural Earth</a>',
        }).addTo(map);
      }).catch(error => console.error(error));
    }

    if (!webgl) {
      showOutline();
      return;
    }

    const layer = leaflet.maplibreGL({
      style: new URL('alumni-basemap.json?v=1', baseUrl).href,
      interactive: false,
      attributionControl: {
        customAttribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · © <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    }).addTo(map);
    const timer = setTimeout(() => {
      layer.remove();
      showOutline();
    }, 10000);
    const glMap = layer.getMaplibreMap();
    glMap.once('load', () => clearTimeout(timer));
    if (getLabelVisibility) {
      glMap.once('style.load', () => {
        const labels = glMap.getStyle().layers.filter(styleLayer => styleLayer.type === 'symbol');
        let currentVisibility;

        function updateLabels() {
          const visibility = getLabelVisibility();
          if (visibility === currentVisibility) return;
          for (const { id } of labels) glMap.setLayoutProperty(id, 'visibility', visibility);
          currentVisibility = visibility;
        }

        updateLabels();
        map.on('zoomend resize', updateLabels);
        layer.once('remove', () => map.off('zoomend resize', updateLabels));
      });
    }
  }

  function createMap(element, chinaOnly = false) {
    const map = leaflet.map(element, {
      scrollWheelZoom: false,
      fadeAnimation: false,
      minZoom: .5,
      maxZoom: 14,
      zoomSnap: chinaOnly ? .25 : 0,
      maxBounds: [[-85.05, -360], [85.05, 360]],
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
    const markers = leaflet.markerClusterGroup({
      animate: false,
      maxClusterRadius: chinaOnly ? 40 : 42,
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
      if (!chinaOnly || city.inChina) markers.addLayer(createMarker(city, alumni));
    }

    const chinaBounds = [[18, 73], [54, 135]];
    const chinaPadding = leaflet.point(26, 18);
    const getLabelVisibility = chinaOnly ? () => {
      const overviewZoom = map.getBoundsZoom(chinaBounds, false, chinaPadding.multiplyBy(2));
      return map.getZoom() > overviewZoom ? 'visible' : 'none';
    } : undefined;

    function resetView() {
      map.closePopup();
      if (chinaOnly) {
        map.fitBounds(chinaBounds, { padding: chinaPadding, animate: false });
      } else {
        const zoom = map.getScaleZoom(map.getSize().x / map.options.crs.scale(0), 0);
        map.setView([10, 0], zoom, { animate: false });
      }
    }
    resetView();
    addBasemap(map, getLabelVisibility);
    markers.addTo(map);
    return resetView;
  }

  mapElement.closest('.alumni-map-section').hidden = false;
  const resetWorld = createMap(mapElement);
  const resetChina = createMap(chinaMapElement, true);
  document.getElementById('alumni-map-reset').addEventListener('click', () => {
    resetWorld();
    resetChina();
  });
})();
