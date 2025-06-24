const dogodkiGridContainer = document.getElementById('gridView');
const dogodkiListContainer = document.getElementById('listView');
const ITEMS_PER_PAGE = 12;

const months = ["JANUAR", "FEBRUAR", "MAREC", "APRIL", "MAJ", "JUNIJ", "JULIJ", "AVGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"];

// Show loading spinner
function showLoadingSpinner() {
    const spinnerHTML = `
        <div class="d-flex justify-content-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    dogodkiGridContainer.innerHTML = spinnerHTML;
    dogodkiListContainer.innerHTML = spinnerHTML;
}

// Create event card HTML
function createEventCard(dogodek) {
  let imgSrc = dogodek.slika;  
  if (dogodek.slika === null) {
        imgSrc = 'images/placeholder.png';
  }
  const eventDate = new Date(dogodek.cas);
  const day = eventDate.getDate();
  const monthNumeric = eventDate.getMonth() + 1;
  const year = eventDate.getFullYear();
  
  const formattedDate = `${day}. ${monthNumeric}. ${year}`;

    return `
        <div class="col-lg-4 col-md-6">
            <div
              class="card event-card"
              onclick="window.location.href='podrobnosti_dogodka.html?id=${dogodek.idDogodek}'"
            >
              <div>
                <img
                  src="${imgSrc}"
                  class="card-img-top event-image"
                  alt="${dogodek.naziv}"
                />
              </div>
              <div class="card-body">
                <div class="mb-2">
                  <span class="badge badge-${(dogodek.tipDogodka.naziv).toLowerCase()}">${dogodek.tipDogodka.naziv}</span>
                </div>
                <h5 class="card-title">${dogodek.naziv}</h5>
                <p class="card-text">
                ${dogodek.opis.substring(0, 100)}...
                </p>
                <div
                  class="d-flex justify-content-between align-items-center mt-3"
                >
                  <small class="text-muted">
                    <i class="bi bi-geo-alt"></i> ${dogodek.naslov.ulica}, ${dogodek.naslov.obcina}
                  </small>
                </div>
              </div>
              <div class="card-footer bg-transparent border-top-0 text-center">
                <div class="date-modern-card">${formattedDate}</div>
              </div>
            </div>
          </div>`
}

// Create event list item HTML
function createEventListItem(dogodek) {
  let imgSrc = dogodek.slika;  
  if (dogodek.slika === null) {
        imgSrc = 'images/placeholder.png';
  }
  const eventDate = new Date(dogodek.cas);
  const day = eventDate.getDate();
  const monthNumeric = eventDate.getMonth() + 1; // JavaScript months are 0-indexed
  const year = eventDate.getFullYear();
  
  const formattedDate = `${day}. ${monthNumeric}. ${year}`;

    return `
    <div class="list-group-item list-view-item p-3"
              onclick="window.location.href='podrobnosti_dogodka.html?id=${dogodek.idDogodek}'"
            >
              <div class="row align-items-center">
                <div class="col-md-2 col-sm-3">
                  <img
                    src="${imgSrc}"
                    class="img-fluid rounded"
                    alt="${dogodek.naziv}"
                  />
                </div>
                <div class="col-md-2 col-sm-3 text-center event-date-list-view">
                  <div class="date-modern">
                    ${formattedDate}
                  </div>
                </div>
                <div class="col-md-8 col-sm-6 py-2">
                  <div class="d-flex align-items-start mb-1">
                    <span class="badge badge-${(dogodek.tipDogodka.naziv).toLowerCase()} me-2">${dogodek.tipDogodka.naziv}</span>
                    <span class="small text-muted"
                      ><i class="bi bi-clock me-1"></i>${new Date(dogodek.cas).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}</span
                    >
                  </div>
                  <h5 class="mb-1">${dogodek.naziv}</h5>
                  <p class="mb-1 text-muted">
                    <i class="bi bi-geo-alt"></i> ${dogodek.naslov.ulica}, ${dogodek.naslov.obcina}
                  </p>
                </div>
              </div>
            </div>
    `;
}

// Funkcija za posodobitev paginacije
function updatePagination(totalItems, currentPage) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginationUl = document.getElementById('paginationUl');
  
  // Določimo koliko strani prikazati glede na širino zaslona
  const maxVisiblePages = window.innerWidth <= 768 ? 3 : 
                         window.innerWidth <= 1200 ? 5 : 7;
  
  let html = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">Prejšnja</a>
    </li>
  `;

  // Generate page numbers with smart pagination
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Prilagodi start page če smo blizu konca
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Dodaj prvo stran in ... če je potrebno
  if (startPage > 1) {
    html += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="1">1</a>
      </li>
    `;
    if (startPage > 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Generate visible page numbers
  for (let page = startPage; page <= endPage; page++) {
    html += `
      <li class="page-item ${page === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${page}">${page}</a>
      </li>
    `;
  }

  // Dodaj ... in zadnjo stran če je potrebno
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    html += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
      </li>
    `;
  }

  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">Naslednja</a>
    </li>
  `;

  paginationUl.innerHTML = html;

  // Dodaj event listenerje za klik na paginacijo
  paginationUl.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const newPage = parseInt(this.dataset.page);
      if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
        document.getElementById('currentPage').value = newPage;
        
        // Update URL with the page parameter
        const url = new URL(window.location);
        url.searchParams.set('page', newPage);
        history.pushState({page: newPage}, '', url);
        
        loadDogodki();
      }
    });
  });
}

// Fetch and display events
async function loadDogodki() {
  showLoadingSpinner();
    
  // Get search input
  const searchInput = document.getElementById('searchInput').value; 

  // Check URL for page parameter first, then fallback to input field
  const urlParams = new URLSearchParams(window.location.search);
  const urlPage = urlParams.get('page');
  
  // Set current page from URL if available, otherwise use the input value or default to 1
  let currentPage = 1;
  if (urlPage && !isNaN(parseInt(urlPage))) {
    currentPage = parseInt(urlPage);
    document.getElementById('currentPage').value = currentPage;
  } else {
    currentPage = parseInt(document.getElementById('currentPage').value) || 1;
  }
  const locationRadius = document.getElementById('locationr').value;
  const radius = document.getElementById('radius').value;
  
  let shouldUseMapSearch = false;
  let searchCoordinates = null;
  
  const isLocationSearch = locationRadius && radius;
  
  const params = new URLSearchParams();
  
  if (!isLocationSearch) {
    params.append('page', currentPage);
    params.append('limit', ITEMS_PER_PAGE);
  } else {
    console.log('loadDogodki: Using location-based search, fetching all events within radius...');
    params.append('limit', '99999');
  }
      
  if (searchInput) {
    params.append('naziv', searchInput);
  }

  // Location filter from top form
  const location = document.getElementById('location').value;
  if (location) params.append('lokacija', location);

  // Event type
  const eventType = document.getElementById('eventType').value;
  if (eventType) params.append('tip', eventType);

  // Date range
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  if (startDate) params.append('zacetek', startDate);
  if (endDate) params.append('konec', endDate);

  // Price range
  const priceRange = document.getElementById('priceRange').value;
  if (priceRange) params.append('cena', priceRange);

  // Sorting
  const sortBy = document.getElementById('sortBy').value;
  if (sortBy) params.append('sort', sortBy);

  // Checkboxes
  const favoriteOrganizers = document.getElementById('favoriteOrganizers').checked;
  if (favoriteOrganizers) params.append('priljubljeniOrganizatorji', 'true');

  const favoriteEvents = document.getElementById('favoriteEvents').checked;
  if (favoriteEvents) params.append('priljubljeniDogodki', 'true');
  
  if (isLocationSearch) {
    shouldUseMapSearch = true;
    try {
      searchCoordinates = await geocode(locationRadius);
      if (!searchCoordinates) {
        throw new Error('Location not found');
      }
      
      console.log(`loadDogodki: Location "${locationRadius}" geocoded to:`, searchCoordinates);
      
      params.append('lat', searchCoordinates.lat);
      params.append('lon', searchCoordinates.lon);
      params.append('radius', radius);
    } catch (error) {
      console.error('Error geocoding address:', error);
      let errorMessage = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle"></i> 
          Lokacija "${locationRadius}" ni bila najdena. <br>
          <small class="mt-2 d-block">
            <strong>Predlogi:</strong><br>
            • Poskusite z večjim mestom: Ljubljana, Maribor, Celje, Kranj<br>
            • Preverite črkovanje lokacije<br>
            • Uporabite polno ime mesta (npr. "Novo mesto" namesto "Nm")
      `;
  
      errorMessage += `
          </small>
        </div>
      `;
      
      dogodkiGridContainer.innerHTML = errorMessage;
      dogodkiListContainer.innerHTML = errorMessage;
      return;
    }
  } else if (locationRadius || radius) {
    console.log('loadDogodki: Only one location field filled, proceeding with regular search without map update');
    shouldUseMapSearch = false;
  }

  const token = localStorage.getItem('userToken');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = `${CONFIG.API_BASE_URL}/dogodki/?${params.toString()}`;
    const response = await fetch(url, {
      headers: headers
    });    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    const dogodki = Array.isArray(data) ? data : (data.dogodki || []);
    const total = Array.isArray(data) ? data.length : (data.total || 0);
    
    console.log(`loadDogodki: Fetched ${dogodki.length} events (total: ${total})`);
    if (isLocationSearch) {
      console.log(`loadDogodki: Location search found ${dogodki.length} events within ${radius}km of "${locationRadius}"`);
    }
        
    // Update grid view
    dogodkiGridContainer.innerHTML = `
      <div class="row row-cols-1 row-cols-md-3 g-4">
        ${dogodki.map(dogodek => createEventCard(dogodek)).join('')}
      </div>
    `;
        
    // Update list view
    dogodkiListContainer.innerHTML = `
      <div class="list-group">
        ${dogodki.map(dogodek => createEventListItem(dogodek)).join('')}
      </div>
    `;

    // Update map if we're using map search
    if (map && shouldUseMapSearch && searchCoordinates) {
      // Clear existing markers
      if (locationMarker) {
        map.removeLayer(locationMarker);
      }
      if (radiusCircle) {
        map.removeLayer(radiusCircle);
      }
      eventMarkers.forEach(marker => map.removeLayer(marker));
      eventMarkers = [];      // Add center marker and circle with custom red icon
      const redIcon = L.divIcon({
        html: '<i class="bi bi-geo-alt-fill" style="color: red; font-size: 24px;"></i>',
        className: 'custom-center-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });
        locationMarker = L.marker([searchCoordinates.lat, searchCoordinates.lon], {
        icon: redIcon,
        zIndexOffset: 1000 // Make sure it's on top of other markers
      })
        .bindPopup('<strong>Središče iskanja</strong><br>Lokacija: ' + locationRadius, {
          className: 'center-marker-popup'
        })
        .addTo(map)
        .openPopup(); // Open the popup immediately to show the center
        radiusCircle = L.circle([searchCoordinates.lat, searchCoordinates.lon], {
        radius: radius * 1000, // Convert km to meters
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.1      }).addTo(map);

      const locationGroups = {};
      
      dogodki.forEach(dogodek => {
        if (dogodek.naslov && dogodek.naslov.lat && dogodek.naslov.lon) {
          // Calculate distance from search center
          const distance = haversine(
            searchCoordinates.lat, 
            searchCoordinates.lon, 
            dogodek.naslov.lat, 
            dogodek.naslov.lon
          );
          
          if (distance <= radius) {
            const locationKey = `${dogodek.naslov.lat},${dogodek.naslov.lon}`;
            
            if (!locationGroups[locationKey]) {
              locationGroups[locationKey] = {
                lat: dogodek.naslov.lat,
                lon: dogodek.naslov.lon,
                ulica: dogodek.naslov.ulica,
                obcina: dogodek.naslov.obcina,
                distance: distance,
                dogodki: []
              };
            }
            
            locationGroups[locationKey].dogodki.push(dogodek);
          }
        }
      });

      Object.values(locationGroups).forEach(group => {
        const blueIcon = L.divIcon({
          html: `<i class="bi bi-geo-alt-fill" style="color: #0d6efd; font-size: 20px;"></i>${group.dogodki.length > 1 ? `<span class="event-count-badge">${group.dogodki.length}</span>` : ''}`,
          className: 'custom-event-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 20]
        });
        
        let popupContent = `
          <div class="location-popup">
            <strong>${group.ulica}, ${group.obcina}</strong><br>
            <small>Oddaljenost: ${group.distance.toFixed(1)} km</small><br>
            <div class="events-at-location">
        `;
        
        group.dogodki.forEach((dogodek, index) => {
          popupContent += `
            <div class="event-item ${index > 0 ? 'mt-2 pt-2' : ''}" ${index > 0 ? 'style="border-top: 1px solid #dee2e6;"' : ''}>
              <strong>${dogodek.naziv}</strong><br>
              <small class="text-muted">${new Date(dogodek.cas).toLocaleDateString('sl-SI')} ${new Date(dogodek.cas).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}</small><br>
              <a href="podrobnosti_dogodka.html?id=${dogodek.idDogodek}" class="btn btn-sm btn-outline-primary mt-1">Podrobnosti</a>
            </div>
          `;
        });
        
        popupContent += `
            </div>
          </div>
        `;
        
        const marker = L.marker([group.lat, group.lon], {
          icon: blueIcon
        })
          .bindPopup(popupContent, {
            maxWidth: 300,
            className: 'multi-event-popup'
          })
          .addTo(map);
        eventMarkers.push(marker);
      });      
      const bounds = radiusCircle.getBounds();
      eventMarkers.forEach(marker => {
        bounds.extend(marker.getLatLng());
      });
      map.fitBounds(bounds, { padding: [50, 50] });
    }    
    if (!isLocationSearch) {
      updatePagination(total, currentPage);
      const paginationNav = document.querySelector('nav[aria-label="Page navigation"]');
      if (paginationNav) {
        paginationNav.style.display = 'block';
      }
    } else {
      const paginationNav = document.querySelector('nav[aria-label="Page navigation"]');
      if (paginationNav) {
        paginationNav.style.display = 'none';
      }
    }    console.log(`loadDogodki: Map update - shouldUseMapSearch: ${shouldUseMapSearch}, isLocationSearch: ${isLocationSearch}`);
    
    if (map && !isLocationSearch) {
      if (locationMarker) {
        map.removeLayer(locationMarker);
        locationMarker = null;
      }
      if (radiusCircle) {
        map.removeLayer(radiusCircle);
        radiusCircle = null;
      }
      
      if (window.searchTriggered || checkIfRegularFiltersAreSet()) {
        console.log('loadDogodki: Updating map with filtered events (no location search)');
        updateMapWithFilteredEvents(dogodki);
      } else {
        console.log('loadDogodki: Clearing map - no search/filters active');
        eventMarkers.forEach(marker => map.removeLayer(marker));
        eventMarkers = [];
        map.setView([46.0569, 14.5058], 8); 
      }
    }
    
  } catch (error) {
    dogodkiGridContainer.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle"></i> 
        Pri nalaganju dogodkov je prišlo do napake.
      </div>
    `;
    dogodkiListContainer.innerHTML = dogodkiGridContainer.innerHTML;
    console.error('Error fetching dogodki:', error);
  }
}


function updateMapWithFilteredEvents(dogodki) {
  console.log(`updateMapWithFilteredEvents: Updating map with ${dogodki.length} filtered events`);
  
  eventMarkers.forEach(marker => map.removeLayer(marker));
  eventMarkers = [];
  
  const locationGroups = {};
  let eventsWithCoordinates = 0;
  let eventsWithoutCoordinates = 0;
  
  dogodki.forEach(dogodek => {
    if (dogodek.naslov && dogodek.naslov.lat && dogodek.naslov.lon) {
      eventsWithCoordinates++;
      const locationKey = `${dogodek.naslov.lat},${dogodek.naslov.lon}`;
      
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = {
          lat: dogodek.naslov.lat,
          lon: dogodek.naslov.lon,
          ulica: dogodek.naslov.ulica,
          obcina: dogodek.naslov.obcina,
          dogodki: []
        };
      }
      locationGroups[locationKey].dogodki.push(dogodek);
    } else {
      eventsWithoutCoordinates++;
      console.log(`Event without coordinates: ${dogodek.naziv}`, dogodek.naslov);
    }
  });
  
  console.log(`updateMapWithFilteredEvents: ${eventsWithCoordinates} events have coordinates, ${eventsWithoutCoordinates} events missing coordinates`);
  
  if (Object.keys(locationGroups).length === 0) {
    console.log('updateMapWithFilteredEvents: No events with coordinates found');
    map.setView([46.0569, 14.5058], 8); 
    return;
  }
  
  const locationCount = Object.keys(locationGroups).length;
  console.log(`updateMapWithFilteredEvents: Creating markers for ${locationCount} unique locations`);
  
  Object.values(locationGroups).forEach(group => {
    const blueIcon = L.divIcon({
      html: `<i class="bi bi-geo-alt-fill" style="color: #0d6efd; font-size: 20px;"></i>${group.dogodki.length > 1 ? `<span class="event-count-badge">${group.dogodki.length}</span>` : ''}`,
      className: 'custom-event-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 20]
    });
    
    let popupContent = `
      <div class="location-popup">
        <strong>${group.ulica}, ${group.obcina}</strong><br>
        <div class="events-at-location">
    `;
    
    group.dogodki.forEach((dogodek, index) => {
      popupContent += `
        <div class="event-item ${index > 0 ? 'mt-2 pt-2' : ''}" ${index > 0 ? 'style="border-top: 1px solid #dee2e6;"' : ''}>
          <strong>${dogodek.naziv}</strong><br>
          <small class="text-muted">${new Date(dogodek.cas).toLocaleDateString('sl-SI')} ${new Date(dogodek.cas).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}</small><br>
          <a href="podrobnosti_dogodka.html?id=${dogodek.idDogodek}" class="btn btn-sm btn-outline-primary mt-1">Podrobnosti</a>
        </div>
      `;
    });
    
    popupContent += `
        </div>
      </div>
    `;
    
    const marker = L.marker([group.lat, group.lon], {
      icon: blueIcon
    })
      .bindPopup(popupContent, {
        maxWidth: 300,
        className: 'multi-event-popup'
      })
      .addTo(map);
    eventMarkers.push(marker);
  });
  
  if (eventMarkers.length > 0) {
    const group = new L.featureGroup(eventMarkers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

async function updateMapWithAllEvents() {
  console.log('updateMapWithAllEvents: Starting to fetch all events for map...');
  try {
    eventMarkers.forEach(marker => map.removeLayer(marker));
    eventMarkers = [];
    
    const params = new URLSearchParams();
    
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) params.append('naziv', searchTerm);
    
    const eventType = document.getElementById('eventType').value;
    if (eventType) params.append('tip', eventType);
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate) params.append('zacetek', startDate);
    if (endDate) params.append('konec', endDate);
    
    const priceRange = document.getElementById('priceRange').value;
    if (priceRange) params.append('cena', priceRange);
    
    const sortBy = document.getElementById('sortBy').value;
    if (sortBy) params.append('sort', sortBy);
    
    const favoriteOrganizers = document.getElementById('favoriteOrganizers').checked;
    if (favoriteOrganizers) params.append('priljubljeniOrganizatorji', 'true');
    
    const favoriteEvents = document.getElementById('favoriteEvents').checked;    if (favoriteEvents) params.append('priljubljeniDogodki', 'true');
    
    params.append('limit', '99999');

    const token = localStorage.getItem('userToken');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki?${params.toString()}`, {
      headers: headers
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }    const data = await response.json();
    const allEvents = Array.isArray(data) ? data : (data.dogodki || []);
    console.log(`updateMapWithAllEvents: Fetched ${allEvents.length} events for map display`);
    
    const locationGroups = {};
    let eventsWithCoordinates = 0;
    let eventsWithoutCoordinates = 0;
    
    allEvents.forEach(dogodek => {
      if (dogodek.naslov && dogodek.naslov.lat && dogodek.naslov.lon) {
        eventsWithCoordinates++;
        const locationKey = `${dogodek.naslov.lat},${dogodek.naslov.lon}`;
        
        if (!locationGroups[locationKey]) {
          locationGroups[locationKey] = {
            lat: dogodek.naslov.lat,
            lon: dogodek.naslov.lon,
            ulica: dogodek.naslov.ulica,
            obcina: dogodek.naslov.obcina,
            dogodki: []
          };
        }
          locationGroups[locationKey].dogodki.push(dogodek);
      } else {
        eventsWithoutCoordinates++;
        console.log(`Event without coordinates: ${dogodek.naziv}`, dogodek.naslov);
      }
    });
    
    console.log(`updateMapWithAllEvents: ${eventsWithCoordinates} events have coordinates, ${eventsWithoutCoordinates} events missing coordinates`);
    
    const locationCount = Object.keys(locationGroups).length;
    console.log(`updateMapWithAllEvents: Creating markers for ${locationCount} unique locations`);
    Object.values(locationGroups).forEach(group => {
      const blueIcon = L.divIcon({
        html: `<i class="bi bi-geo-alt-fill" style="color: #0d6efd; font-size: 20px;"></i>${group.dogodki.length > 1 ? `<span class="event-count-badge">${group.dogodki.length}</span>` : ''}`,
        className: 'custom-event-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 20]
      });
      
      let popupContent = `
        <div class="location-popup">
          <strong>${group.ulica}, ${group.obcina}</strong><br>
          <div class="events-at-location">
      `;
      
      group.dogodki.forEach((dogodek, index) => {
        popupContent += `
          <div class="event-item ${index > 0 ? 'mt-2 pt-2' : ''}" ${index > 0 ? 'style="border-top: 1px solid #dee2e6;"' : ''}>
            <strong>${dogodek.naziv}</strong><br>
            <small class="text-muted">${new Date(dogodek.cas).toLocaleDateString('sl-SI')} ${new Date(dogodek.cas).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}</small><br>
            <a href="podrobnosti_dogodka.html?id=${dogodek.idDogodek}" class="btn btn-sm btn-outline-primary mt-1">Podrobnosti</a>
          </div>
        `;
      });
      
      popupContent += `
          </div>
        </div>
      `;
      
      const marker = L.marker([group.lat, group.lon], {
        icon: blueIcon
      })
        .bindPopup(popupContent, {
          maxWidth: 300,
          className: 'multi-event-popup'
        })
        .addTo(map);
      eventMarkers.push(marker);
    });
    
    if (Object.keys(locationGroups).length > 0 && !locationMarker) {
      const group = new L.featureGroup(eventMarkers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
    
  } catch (error) {
    console.error('Error updating map with all events:', error);
  }
}


async function geocode(address) {
  console.log(`Starting geocoding for address: ${address}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); 
    
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/dogodki/geocode/${encodeURIComponent(address)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Location not found in geocoding service');
        return null;
      }
      throw new Error(`Geocoding service returned status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      lat: data.lat,
      lon: data.lon,
      formattedAddress: data.formattedAddress
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠ Geocoding request timed out after 5 seconds');
    } else {
      console.warn('⚠ Geocoding failed:', error.message);
    }
    return null;
  }
}

// Haversine distance calculation function
function haversine(lat1, lon1, lat2, lon2) {
  // Convert latitude and longitude from degrees to radians
  const toRad = x => x * Math.PI / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Load dogodki when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get search params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('naziv');
    const pageParam = urlParams.get('page');
    
    // If page parameter exists in URL, set it in the input
    if (pageParam && !isNaN(parseInt(pageParam))) {
        document.getElementById('currentPage').value = parseInt(pageParam);
    }

    // get user token and check if logged in
    const userToken = localStorage.getItem('userToken');
    const currentUserId = userToken ? parseJwt(userToken).idUporabnik : null;

    const favorites = document.getElementById('favorites-options');
    if (currentUserId) 
    {
      favorites.classList.remove('d-none');
      favorites.classList.add('d-block');
    }
    else{
      favorites.classList.remove('d-block');
      favorites.classList.add('d-none');
    }      
    if (searchTerm) {
        document.getElementById('searchInput').value = searchTerm;
        window.searchTriggered = true;
        loadDogodki();
    } else {
        window.searchTriggered = false;
        loadDogodki();
    }

    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const glider = document.querySelector('.view-toggle-glider');

    function updateGlider() {
      const activeButton = document.querySelector('.view-toggle-btn.active');
      if (activeButton && glider) {
        glider.style.width = `${activeButton.offsetWidth}px`;
        glider.style.transform = `translateX(${activeButton.offsetLeft - 5}px)`; // 5px is the container padding
      }
    }

    if (gridViewBtn && listViewBtn && glider) {
      // Set initial glider position
      updateGlider();

      gridViewBtn.addEventListener('click', function() {
          document.getElementById('gridView').classList.remove('d-none');
          document.getElementById('listView').classList.add('d-none');
          this.classList.add('active');
          listViewBtn.classList.remove('active');
          updateGlider();
      });
        
      listViewBtn.addEventListener('click', function() {
          document.getElementById('listView').classList.remove('d-none');
          document.getElementById('gridView').classList.add('d-none');
          this.classList.add('active');
          gridViewBtn.classList.remove('active');
          updateGlider();
      });

      // Update glider on window resize if layout changes
      window.addEventListener('resize', updateGlider);
    } else {
      console.error('View toggle buttons or glider not found. Glider animation will not work.');
    }

    // Handle browser history navigation
    window.addEventListener('popstate', function(event) {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');
        
        if (pageParam && !isNaN(parseInt(pageParam))) {
            document.getElementById('currentPage').value = parseInt(pageParam);
        } else {
            document.getElementById('currentPage').value = 1;
        }
        
        loadDogodki();
    });
    
    // Klic funkcije ob nalaganju strani
    handleViewModeForScreenSize();
});

// Dodajte to funkcijo za upravljanje prikaza glede na velikost zaslona
function handleViewModeForScreenSize() {
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (window.innerWidth <= 576) {
        // Na majhnih zaslonih vedno prikaži grid view
        if (gridView && listView) {
            gridView.classList.remove('d-none');
            listView.classList.add('d-none');
        }
        
        // Aktiviraj grid view gumb (če obstaja)
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        }
    }
}

// Preklapljanje med karticami in seznamom
document.getElementById('gridViewBtn').addEventListener('click', function() {
    document.getElementById('gridView').classList.remove('d-none');
    document.getElementById('listView').classList.add('d-none');
    this.classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
  });
  
  document.getElementById('listViewBtn').addEventListener('click', function() {
    document.getElementById('listView').classList.remove('d-none');
    document.getElementById('gridView').classList.add('d-none');
    this.classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
  });
  const toggle = document.getElementById('toggleFilter');
  const filterCard = document.getElementById('filterCard');

  toggle.addEventListener('change', function() {
    filterCard.classList.toggle('show', this.checked);
  });

document.querySelector('#filterCard form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const hasRegularFilters = checkIfRegularFiltersAreSet();
    
    if (hasRegularFilters) {
        window.searchTriggered = true;
    } else {
        window.searchTriggered = false;
    }
    
    loadDogodki();
});

document.querySelector('#filterCard form button[type="reset"]').addEventListener('click', function() {
    if (map) {
        if (locationMarker) {
            map.removeLayer(locationMarker);
            locationMarker = null;
        }
        if (radiusCircle) {
            map.removeLayer(radiusCircle);
            radiusCircle = null;
        }
        
        eventMarkers.forEach(marker => map.removeLayer(marker));
        eventMarkers = [];
        
        map.setView([46.0569, 14.5058], 8);
    }
    document.getElementById('currentPage').value = 1;
    
    const paginationNav = document.querySelector('nav[aria-label="Page navigation"]');
    if (paginationNav) {
        paginationNav.style.display = 'block';
    }
    
    window.searchTriggered = false;
    
    setTimeout(() => {
        loadAllEventsForReset();
    }, 100);
});

document.getElementById('searchForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const hasRegularFilters = checkIfRegularFiltersAreSet();
  
  if (hasRegularFilters) {
      window.searchTriggered = true;
  } else {
      window.searchTriggered = false;
  }
  
  loadDogodki();
});

document.getElementById('searchInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
      e.preventDefault();
      
      const hasRegularFilters = checkIfRegularFiltersAreSet();
      
      if (hasRegularFilters) {
          window.searchTriggered = true;
      } else {
          window.searchTriggered = false;
      }
      
      loadDogodki();
  }
});

// Global variables for map
let map = null;
let locationMarker = null;
let radiusCircle = null;
let eventMarkers = [];

// Initialize map
document.addEventListener("DOMContentLoaded", function () {
  map = L.map("map").setView([46.0569, 14.5058], 8); // Starting view (Ljubljana)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  }).addTo(map);
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleMapButton = document.getElementById("toggleMap");
  const advancedFiltering = document.querySelector(".advanced-filtering");
  const toggleMapText = document.getElementById("toggleMapText");
  const mapIcon = document.getElementById("mapIcon");

  advancedFiltering.classList.add("hidden");

  toggleMapButton.addEventListener("click", () => {
    if (advancedFiltering.classList.contains("hidden")) {
      advancedFiltering.classList.remove("hidden");
      advancedFiltering.classList.add("fade-in");
      toggleMapText.textContent = "Zapri zemljevid za iskanje po lokaciji";
      toggleMapButton.setAttribute("aria-expanded", "true");
      mapIcon.classList.remove("bi-map");
      mapIcon.classList.add("bi-map");
    } else {
      advancedFiltering.classList.add("fade-out");
      toggleMapText.textContent = "Prikaži zemljevid za iskanje po lokaciji";
      toggleMapButton.setAttribute("aria-expanded", "false");
      mapIcon.classList.remove("bi-map");
      mapIcon.classList.add("bi-map");
      advancedFiltering.addEventListener(
        "animationend",
        () => {
          advancedFiltering.classList.add("hidden");
          advancedFiltering.classList.remove("fade-out");
        },
        { once: true }
      );
    }
  });
});

async function loadAllEventsForReset() {
  showLoadingSpinner();
  
  const token = localStorage.getItem('userToken');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const params = new URLSearchParams();
    params.append('page', 1);
    params.append('limit', ITEMS_PER_PAGE);
    
    const url = `${CONFIG.API_BASE_URL}/dogodki/?${params.toString()}`;
    const response = await fetch(url, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    const dogodki = Array.isArray(data) ? data : (data.dogodki || []);
    const total = Array.isArray(data) ? data.length : (data.total || 0);
    
    console.log(`loadAllEventsForReset: Loaded ${dogodki.length} events for reset view (total: ${total})`);
        
    dogodkiGridContainer.innerHTML = `
      <div class="row row-cols-1 row-cols-md-3 g-4">
        ${dogodki.map(dogodek => createEventCard(dogodek)).join('')}
      </div>
    `;
        
    dogodkiListContainer.innerHTML = `
      <div class="list-group">
        ${dogodki.map(dogodek => createEventListItem(dogodek)).join('')}
      </div>
    `;

    updatePagination(total, 1);
    
  } catch (error) {
    dogodkiGridContainer.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle"></i> 
        Pri nalaganju dogodkov je prišlo do napake.
      </div>
    `;
    dogodkiListContainer.innerHTML = dogodkiGridContainer.innerHTML;
    console.error('Error fetching events for reset:', error);
  }
}

function checkIfRegularFiltersAreSet() {
  const searchInput = document.getElementById('searchInput').value.trim();
  
  const location = document.getElementById('location').value.trim();
  
  const eventType = document.getElementById('eventType').value;
  
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  const priceRange = document.getElementById('priceRange').value;
  
  const sortBy = document.getElementById('sortBy').value;
  
  // Checkboxes
  const favoriteOrganizers = document.getElementById('favoriteOrganizers').checked;
  const favoriteEvents = document.getElementById('favoriteEvents').checked;
    const hasFilters = searchInput || 
                     location || 
                     (eventType && eventType !== '') || 
                     startDate || 
                     endDate || 
                     (priceRange && priceRange !== '') || 
                     (sortBy && sortBy !== 'date') || 
                     favoriteOrganizers || 
                     favoriteEvents;
  
  return hasFilters;
  
  console.log('checkIfRegularFiltersAreSet:', {
    searchInput: searchInput,
    location: location,
    eventType: eventType,
    startDate: startDate,
    endDate: endDate,
    priceRange: priceRange,
    sortBy: sortBy,
    favoriteOrganizers: favoriteOrganizers,
    favoriteEvents: favoriteEvents,
    hasFilters: hasFilters
  });
  
  return hasFilters;
}

function updateSearchPlaceholder() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        if (window.innerWidth <= 576) {
            searchInput.placeholder = "Išči dogodke";
        } else {
            searchInput.placeholder = "Išči dogodke po naslovu, opisu ali lokaciji...";
        }
    }
}

document.addEventListener('DOMContentLoaded', updateSearchPlaceholder);

window.addEventListener('resize', updateSearchPlaceholder);

window.addEventListener('resize', function() {
  // Ponovno naloži paginacijo pri spremembah velikosti okna
  const currentPageInput = document.getElementById('currentPage');
  if (currentPageInput) {
    // Ohrani trenutno stran in ponovno naloži dogodke z novo paginacijo
    loadDogodki();
  }
});