// XSS Protection - Fallback for encodeInput function
if (typeof encodeInput !== 'function') {
    function encodeInput(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}

// Sanitization function for user input (preserves šumniki)
function sanitizeUserInput(input, allowedChars = '[^\\p{L}0-9 ,.!?-]') {
    if (!input || typeof input !== 'string') return '';
    
    // Fallback pattern for browsers that don't support Unicode property classes
    let pattern = allowedChars;
    
    // Check if Unicode property classes are supported
    try {
        new RegExp('\\p{L}', 'u');
        // Unicode property classes are supported, use the pattern as-is
        const regex = new RegExp(pattern, 'gu');
        return input.replace(regex, '');
    } catch (e) {        // Fallback to traditional character classes for older browsers
        const fallbackPatterns = {
            '[^\\p{L}0-9 ,.!?-]': '[^a-zA-ZšđčćžŠĐČĆŽ0-9 ,.!?\\-]',
            '[^\\p{L}0-9 ]': '[^a-zA-ZšđčćžŠĐČĆŽ0-9 ]',
            '[^\\p{L}0-9]': '[^a-zA-ZšđčćžŠĐČĆŽ0-9]',
            '[^0-9]': '[^0-9]',
            '[^\\p{L}0-9 ,.!?-\\n\\r]': '[^a-zA-ZšđčćžŠĐČĆŽ0-9 ,.!?\\-\\n\\r]',
            '[^\\p{L}0-9@._:/?=-]': '[^a-zA-ZšđčćžŠĐČĆŽ0-9@._:/?=\\-]',
            '[^\\p{L}0-9 ,.!?:-]': '[^a-zA-ZšđčćžŠĐČĆŽ0-9 ,.!?:\\-]'
        };
        
        pattern = fallbackPatterns[allowedChars] || '[^a-zA-ZšđčćžŠĐČĆŽ0-9 ,.!?\\-]';
        const regex = new RegExp(pattern, 'g');
        return input.replace(regex, '');
    }
}

// Specialized sanitization for error messages
function sanitizeErrorMessage(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') return 'Neznana napaka';
    return sanitizeUserInput(errorMessage, '[^\\p{L}0-9 ,.!?:-]');
}

(function () {
    'use strict'
    const forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }
        
        form.classList.add('was-validated')
      }, false)
    })
  })()
      
  // Add validation constraints to form fields
  document.addEventListener('DOMContentLoaded', function() {
    // Set maxlength constraints for all form fields
    const naslovInput = document.getElementById('naslov');
    if (naslovInput) {
      naslovInput.setAttribute('maxlength', '100');
      naslovInput.setAttribute('required', '');
    }
    
    const ulicaInput = document.getElementById('ulica');
    if (ulicaInput) {
      ulicaInput.setAttribute('maxlength', '45');
    }
    
    const hisnaInput = document.getElementById('hisna-stevilka');
    if (hisnaInput) {
      hisnaInput.setAttribute('maxlength', '10');
    }
    
    const postnaInput = document.getElementById('postna-stevilka');
    if (postnaInput) {
      postnaInput.setAttribute('maxlength', '10');
    }
    
    const obcinaInput = document.getElementById('obcina');
    if (obcinaInput) {
      obcinaInput.setAttribute('maxlength', '45');
    }
    
    const opisInput = document.getElementById('opis');
    if (opisInput) {
      // No maxlength for longtext, but we should still mark it as required
      opisInput.setAttribute('required', '');
    }
    
    const cenaInput = document.getElementById('cena');
    if (cenaInput) {
      cenaInput.setAttribute('pattern', '^\d{1,6}(\.\d{1,2})?$');
      cenaInput.setAttribute('title', 'Vnesite veljavno ceno (največ 6 števk in 2 decimalni mesti)');
      cenaInput.setAttribute('required', '');
    }
    
    const urlInput = document.getElementById('eventim_url');
    if (urlInput) {
      urlInput.setAttribute('maxlength', '200');
      // URL is optional, so no required attribute
    }
    
    // Add custom validation messages
    naslovInput.addEventListener('input', function() {
      if (this.value.length > 100) {
        this.setCustomValidity('Naslov dogodka ne sme presegati 100 znakov');
      } else {
        this.setCustomValidity('');
      }
    });
  });
  
  // Ponastavitev obrazca
  document.getElementById('reset-form').addEventListener('click', function() {
    const form = document.getElementById('dogodek-form');
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('dogodek-id').value = '';
    document.getElementById('form-title').textContent = 'Nov dogodek';
    // Reset submit button text
    document.querySelector('#dogodek-form button[type="submit"]').textContent = 'Shrani dogodek';
    
    // Update visibility of promotion checkbox based on user role
    updatePromotionCheckboxVisibility();
  });

  // Handle form submission for adding new event 
  const dogodekForm = document.getElementById('dogodek-form');
  dogodekForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    const form = e.target;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    
    // Show loading spinner
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Shranjevanje...
    `;
    
    // Add loading message
    showLoadingMessage('dogodek-form');
    
    // Get form values with validation
    const naslov = form.querySelector('#naslov').value;
    const ulica = form.querySelector('#ulica').value;
    const hisnaStevilka = form.querySelector('#hisna-stevilka').value;
    const postna = form.querySelector('#postna-stevilka').value;
    const obcina = form.querySelector('#obcina').value;
    const opis = form.querySelector('#opis').value;
    const cena = form.querySelector('#cena').value;
    const eventimUrl = form.querySelector('#eventim_url').value || '';
    
    // Validate field lengths directly
    if (naslov.length > 100) {
      showAlert('Naslov dogodka ne sme presegati 100 znakov.', 'danger');
      removeLoadingMessage();
      return;
    }
    if (ulica.length > 45) {
      showAlert('Ulica ne sme presegati 45 znakov.', 'danger');
      removeLoadingMessage();
      return;
    }
    if (hisnaStevilka.length > 10) {
      showAlert('Hišna številka ne sme presegati 10 znakov.', 'danger');
      removeLoadingMessage();
      return;
    }
    if (postna.length > 10) {
      showAlert('Poštna številka ne sme presegati 10 znakov.', 'danger');
      removeLoadingMessage();
      return;
    }
    if (obcina.length > 45) {
      showAlert('Občina ne sme presegati 45 znakov.', 'danger');
      removeLoadingMessage();
      return;
    }
    if (eventimUrl.length > 200) {
      showAlert('URL ne sme presegati 200 znakov.', 'danger');
      removeLoadingMessage();
      return;
    }
    
    // Validate price format
    const priceRegex = /^\d{1,6}(\.\d{1,2})?$/;
    if (!priceRegex.test(cena)) {
      showAlert('Cena mora biti številka z največ 6 števkami in 2 decimalnima mestoma.', 'danger');
      removeLoadingMessage();
      return;
    }
      // Sanitize input values to prevent XSS attacks
    const sanitizedNaslov = sanitizeUserInput(naslov);
    const sanitizedUlica = sanitizeUserInput(ulica, '[^\\p{L}0-9 ]');
    const sanitizedHisnaStevilka = sanitizeUserInput(hisnaStevilka, '[^\\p{L}0-9]');
    const sanitizedPostna = sanitizeUserInput(postna, '[^0-9]');
    const sanitizedObcina = sanitizeUserInput(obcina, '[^\\p{L}0-9 ]');
    const sanitizedOpis = sanitizeUserInput(opis, '[^\\p{L}0-9 ,.!?-\\n\\r]');
    const sanitizedEventimUrl = sanitizeUserInput(eventimUrl, '[^\\p{L}0-9@._:/?=-]');
    
    const formData = new FormData();
    formData.append('naslov_dogodka', sanitizedNaslov);
    formData.append('tip_dogodka', form.querySelector('#tip-dogodka').value);
    const naslovObj = {
      ulica: sanitizedUlica,
      hisna_stevilka: sanitizedHisnaStevilka,
      postna_stevilka: sanitizedPostna,
      obcina: sanitizedObcina
    };
    formData.append('naslov', JSON.stringify(naslovObj));
    formData.append('cas', form.querySelector('#cas').value);
    formData.append('opis', sanitizedOpis);
    formData.append('cena', cena);
    formData.append('eventim_url', sanitizedEventimUrl);
    const slikaFile = form.querySelector('#slika').files[0];
    if (slikaFile) formData.append('slika', slikaFile);
    // include promotion flag if needed
    const promoviran = form.querySelector('#je-promoviran').checked;
    formData.append('je_promoviran', promoviran ? '1' : '0');
    // Append event ID for editing if present
    const eventId = form.querySelector('#dogodek-id').value;
    if (eventId) formData.append('id', eventId);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const result = await response.json();
      
      // Remove loading message
      removeLoadingMessage();
      
      // Reset button
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
      
      if (response.ok) {
        if (eventId) {
          showAlert('Dogodek uspešno posodobljen.', 'success');
        } else {
          showAlert('Dogodek uspešno dodan.',   'success');
        }
         // Počakaj 3 sekunde, nato osveži
            setTimeout(() => {
              window.location.reload();
            }, 2000);
      } else {
        showAlert(result.error || 'Napaka pri dodajanju dogodka.', 'danger');
      }
    } catch (error) {
      // Remove loading message
      removeLoadingMessage();
      
      // Reset button
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
      
      console.error('Error adding event:', error);
      showAlert('Napaka pri pošiljanju podatkov.', 'danger');
    }
  });

  // Constants
  const ITEMS_PER_PAGE = 12; // Show 12 items per page

  // Load and render events in the table
  async function loadEvents() {
    const tbody = document.querySelector('.upcoming-events tbody');
    tbody.innerHTML = '';

    // Show loading spinner
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Nalaganje...</span>
          </div>
          <p class="mt-2 text-muted">Nalaganje dogodkov...</p>
        </td>
      </tr>
    `;

    try {
      const token = localStorage.getItem('userToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Get current page from input
      const currentPage = parseInt(document.getElementById('currentPage').value) || 1;

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: ITEMS_PER_PAGE
      });

      // Add search parameters
      const searchInput = document.getElementById('searchInput').value;
      if (searchInput) {
        params.append('naziv', searchInput);
      }

      // Add filter parameters
      const eventType = document.getElementById('eventType').value;
      if (eventType) {
        params.append('tip', eventType);
      }

      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      if (startDate) params.append('zacetek', startDate);
      if (endDate) params.append('konec', endDate);

      const promotedFilter = document.getElementById('promotedFilter').value;
      if (promotedFilter !== '') {
        params.append('je_promoviran', promotedFilter);
      }      // Determine which endpoint to use based on user role
      let apiEndpoint = `${CONFIG.API_BASE_URL}/dogodki`; // Default for admin
        // Check user role and set appropriate endpoint
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          // Only admin sees all events, everyone else (including organizator) sees only their own
          if (userInfo.tipUporabnika === 'Admin') {
            apiEndpoint = `${CONFIG.API_BASE_URL}/dogodki`; // Admin sees all events
          } else if (userInfo.tipUporabnika === 'Organizator') {
            apiEndpoint = `${CONFIG.API_BASE_URL}/dogodki/moji`; // Organizator sees only their events
          }
        } catch (error) {
          console.error('Error parsing user info:', error);
        }
      }

      // Fetch events with pagination and filters
      const response = await fetch(`${apiEndpoint}?${params.toString()}`, { headers });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      // Handle both array response (from /moji) and object response (from main endpoint)
      const dogodki = Array.isArray(result) ? result : (result.dogodki || []);
      const total = Array.isArray(result) ? result.length : (result.total || 0);
      tbody.innerHTML = ''; // Clear loading spinner

      if (dogodki.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4">
              <p class="text-muted mb-0">Ni najdenih dogodkov.</p>
            </td>
          </tr>
        `;
        return;
      }      // Render events
      dogodki.forEach(ev => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${encodeInput(ev.idDogodek)}</td>
          <td>${encodeInput(ev.naziv)}</td>
          <td><span class="badge badge-${encodeInput(ev.tipDogodka?.naziv?.toLowerCase() || 'default')}">${encodeInput(ev.tipDogodka?.naziv || 'Neznano')}</span></td>
          <td>${encodeInput(ev.naslov?.ulica || '')} ${encodeInput(ev.naslov?.hisna_stevilka || '')}, ${encodeInput(ev.naslov?.obcina || '')}</td>
          <td>${encodeInput(new Date(ev.cas).toLocaleString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</td>
          <td class="text-center">
            ${ev.je_promoviran == 1 || ev.je_promoviran === '1' || ev.je_promoviran === true ? 
              '<i class="bi bi-check-circle-fill text-success"></i>' : 
              '<i class="bi bi-x-circle-fill text-secondary"></i>'}
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-warning btn-edit" data-id="${encodeInput(ev.idDogodek)}">
              <i class="bi bi-pencil-fill"></i> Uredi
            </button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${encodeInput(ev.idDogodek)}">
              <i class="bi bi-trash-fill"></i> Izbriši
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });

      // Update pagination
      updatePagination(total, currentPage);

      // Attach event handlers
      attachEventHandlers();

    } catch (error) {
      console.error('Error loading events:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="alert alert-danger mb-0">
              <i class="bi bi-exclamation-triangle"></i> 
              Napaka pri nalaganju dogodkov. Prosimo, poskusite znova.
            </div>
          </td>
        </tr>
      `;
    }
  }

  // Update pagination controls
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

    // Add click handlers for pagination
    paginationUl.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const newPage = parseInt(this.dataset.page);
        if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
          document.getElementById('currentPage').value = newPage;
          loadEvents();
        }
      });
    });
  }

  // Attach event handlers for edit and delete buttons
  function attachEventHandlers() {
    // Attach delete handlers
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        await deleteEvent(btn.dataset.id);
      });
    });

    // Attach edit handlers
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const token = localStorage.getItem('userToken');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const res = await fetch(`${CONFIG.API_BASE_URL}/dogodki/${id}`, { headers });
          if (!res.ok) {
            showAlert('Napaka pri pridobivanju podatkov za urejanje.', 'danger');
            return;
          }
          const ev = await res.json();
          populateFormForEditing(ev);
        } catch (error) {
          console.error('Napaka pri nalaganju za urejanje:', error);
          showAlert('Napaka pri nalaganju podatkov za urejanje.', 'danger');
        }
      });
    });
  }  // Function to update page heading based on user role
  function updatePageHeading() {
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        const bannerHeading = document.querySelector('.banner h2');
        const sectionHeading = document.querySelector('.upcoming-events-title');
        
        if (userInfo.tipUporabnika === 'Organizator') {
          bannerHeading.textContent = 'Upravljanje mojih dogodkov';
          if (sectionHeading) {
            sectionHeading.innerHTML = '<i class="bi bi-calendar-event"></i> Upravljanje mojih dogodkov';
          }
          // Update page title as well
          document.title = 'SkupajTukaj - Upravljanje mojih dogodkov';
        } else {
          bannerHeading.textContent = 'Upravljanje dogodkov';
          if (sectionHeading) {
            sectionHeading.innerHTML = '<i class="bi bi-calendar-event"></i> Upravljanje dogodkov';
          }
          // Update page title as well
          document.title = 'SkupajTukaj - Upravljanje dogodkov';
        }
        
        // Update promotion checkbox visibility
        updatePromotionCheckboxVisibility();
      } catch (error) {
        console.error('Error parsing user info:', error);
      }
    }
  }

  // Function to update promotion checkbox visibility based on user role
  function updatePromotionCheckboxVisibility() {
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        const promotionCheckboxContainer = document.querySelector('#je-promoviran').closest('.form-check');
        
        if (userInfo.tipUporabnika === 'Organizator') {
          // Hide promotion checkbox for organizers
          if (promotionCheckboxContainer) {
            promotionCheckboxContainer.style.display = 'none';
          }
        } else {
          // Show promotion checkbox for admins
          if (promotionCheckboxContainer) {
            promotionCheckboxContainer.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Error parsing user info:', error);
      }
    }
  }

  // Function to check URL parameters and load event for editing
async function checkURLParamsAndLoadEvent() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  
  if (eventId) {
    try {
      const token = localStorage.getItem('userToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/${eventId}`, { headers });
      
      if (!response.ok) {
        showAlert('Napaka pri pridobivanju podatkov dogodka.', 'danger');
        return;
      }
      
      const event = await response.json();
      populateFormForEditing(event);
      
      // Clear the URL parameter to avoid reloading the same event when the page refreshes
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
    } catch (error) {
      console.error('Napaka pri nalaganju dogodka iz URL parametra:', error);
      showAlert('Napaka pri nalaganju podatkov dogodka.', 'danger');
    }
  }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Update page heading based on user role
  updatePageHeading();
  
  // Check URL parameters and load event if specified
  checkURLParamsAndLoadEvent();
  
  // Load initial events
  loadEvents();

  // Handle search form submission
  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('currentPage').value = 1; // Reset to first page
    loadEvents();
  });

  // Handle filter form submission
  document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('currentPage').value = 1; // Reset to first page
    loadEvents();
  });

  // Handle filter form reset
  document.getElementById('filterForm').addEventListener('reset', (e) => {
    setTimeout(() => {
      document.getElementById('currentPage').value = 1; // Reset to first page
      loadEvents();
    }, 0);
  });
});
  // Delete event by ID
  async function deleteEvent(id) {
    // Show custom confirmation modal
    const confirmed = await showConfirmationModal(
      'Ali ste prepričani, da želite izbrisati ta dogodek?',
      'Potrdi brisanje'
    );

    if (!confirmed) {
      return; // User cancelled the action
    }

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        showAlert('Dogodek uspešno izbrisan.', 'success');
        loadEvents();
      } else {
        const result = await response.json();
        showAlert(result.error || 'Napaka pri brisanju dogodka.', 'danger');
      }
    } catch (error) {
      console.error('Napaka pri brisanju dogodka:', error);
      showAlert('Napaka pri brisanju dogodka.', 'danger');
    }
  }
  function showAlert(message, type = 'success', formId = 'dogodek-form') {
    // Remove any existing loading messages
    removeLoadingMessage();

    const form = document.getElementById(formId);
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} mt-3`;
    alert.textContent = sanitizeErrorMessage(message);

    // Vstavi obvestilo na začetek obrazca
    form.firstElementChild.before(alert);

    // Samodejno odstrani po 3 sekundah
    setTimeout(() => {
      alert.remove();
    }, 3000);
  }

  // Function to show loading message with spinner
  function showLoadingMessage(formId) {
    // Remove any existing alerts or loading messages
    removeLoadingMessage();
    
    const form = document.getElementById(formId);
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message text-center py-3 mt-3';
    loadingDiv.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Nalaganje...</span>
      </div>
      <p class="mt-2 text-muted">Shranjujem dogodek, prosimo počakajte...</p>
    `;
    
    // Insert at the beginning of the form
    form.firstElementChild.before(loadingDiv);
  }

  // Function to remove loading message
  function removeLoadingMessage() {
    // Remove any existing loading messages or alerts
    const existingLoadingMessages = document.querySelectorAll('.loading-message');
    existingLoadingMessages.forEach(msg => msg.remove());
    
    // Also remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
  }  // Function to populate form for editing
  function populateFormForEditing(event) {
  // Update form title
  document.getElementById('form-title').textContent = 'Uredi dogodek';
  
  // Set event ID in hidden field
  document.getElementById('dogodek-id').value = encodeInput(event.idDogodek);
  
  // Populate basic event details with sanitization
  document.getElementById('naslov').value = encodeInput(event.naziv);
  document.getElementById('tip-dogodka').value = encodeInput(event.TK_tip_dogodka || event.tipDogodka?.idTip_dogodka);
  document.getElementById('opis').value = encodeInput(event.opis);
  
  // Populate price - handle different data structures
  let eventPrice = '';
  if (event.cena !== undefined && event.cena !== null) {
    // Direct price field
    eventPrice = event.cena;
  } else if (event.cenik) {
    // Price from cenik relationship
    let cenikData = event.cenik;
    
    // Handle different Bookshelf formats
    if (cenikData.models && cenikData.models.length > 0) {
      eventPrice = cenikData.models[0].attributes?.cena || cenikData.models[0].cena || '';
    } else if (Array.isArray(cenikData) && cenikData.length > 0) {
      eventPrice = cenikData[0].cena || '';
    } else if (cenikData.cena !== undefined) {
      eventPrice = cenikData.cena;
    }
  }
  document.getElementById('cena').value = encodeInput(eventPrice);
  
  // Populate event date and time
  if (event.cas) {
    const eventDateTime = new Date(event.cas);
    const isoString = eventDateTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    document.getElementById('cas').value = isoString;
  }
  
  // Populate address details with sanitization
  if (event.naslov) {
    document.getElementById('ulica').value = encodeInput(event.naslov.ulica || '');
    document.getElementById('hisna-stevilka').value = encodeInput(event.naslov.hisna_stevilka || '');
    document.getElementById('postna-stevilka').value = encodeInput(event.naslov.postna_stevilka || '');
    document.getElementById('obcina').value = encodeInput(event.naslov.obcina || '');
  }
  
  // Populate eventim URL if available
  if (event.eventim_url) {
    document.getElementById('eventim_url').value = encodeInput(event.eventim_url);
  }
  
  // Set promotion checkbox
  const promoviran = event.je_promoviran == 1 || event.je_promoviran === '1' || event.je_promoviran === true;
  document.getElementById('je-promoviran').checked = promoviran;
  
  // Update submit button text
  document.querySelector('#dogodek-form button[type="submit"]').textContent = 'Posodobi dogodek';
  
  // Scroll to form
  document.getElementById('dogodek-form').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
  
  // Update promotion checkbox visibility based on user role
  updatePromotionCheckboxVisibility();
}

window.addEventListener('resize', function() {
  // Ponovno naloži paginacijo pri spremembah velikosti okna
  const currentPageInput = document.getElementById('currentPage');
  if (currentPageInput) {
    loadEvents();
  }
});

  // Custom confirmation modal system
  function createConfirmationModal() {
    // Check if modal already exists
    let existingModal = document.getElementById('custom-confirmation-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div class="modal fade" id="custom-confirmation-modal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">          
          <div class="modal-header border-0 pb-0">
              <h5 class="modal-title d-flex align-items-center" id="confirmationModalLabel">
                <i class="bi bi-exclamation-triangle-fill text-primary me-2 fs-4"></i>
                <span>Potrditev akcije</span>
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-3" id="confirmation-message">Ali ste prepričani?</p>
              <div class="alert alert-primary d-flex align-items-center mb-0" role="alert">
                <i class="bi bi-info-circle-fill me-2"></i>
                <div>
                  <strong>Opozorilo:</strong> Ta akcija je nepovratna.
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i>Prekliči
              </button>
              <button type="button" class="btn btn-danger" id="confirm-action-btn">
                <i class="bi bi-trash-fill me-1"></i>Potrdi brisanje
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('custom-confirmation-modal');
  }

  // Custom confirmation modal styles
  const confirmationModalStyles = document.createElement('style');
  confirmationModalStyles.textContent = `
    #custom-confirmation-modal .modal-content {
      border: none;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    #custom-confirmation-modal .modal-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 1.5rem 1.5rem 1rem;
    }

    #custom-confirmation-modal .modal-title {
      font-weight: 600;
      color: #495057;
    }

    #custom-confirmation-modal .modal-body {
      padding: 1rem 1.5rem;
      background: #fff;
    }

    #custom-confirmation-modal .modal-footer {
      background: #f8f9fa;
      padding: 1rem 1.5rem 1.5rem;
      justify-content: space-between;
    }

    #custom-confirmation-modal .btn {
      border-radius: 8px;
      padding: 0.5rem 1.2rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    #custom-confirmation-modal .btn-danger {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      border: none;
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    #custom-confirmation-modal .btn-danger:hover {
      background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
    }

    #custom-confirmation-modal .btn-secondary {
      background: #6c757d;
      border: none;
      box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
    }

    #custom-confirmation-modal .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
    }

    #custom-confirmation-modal .alert-primary {
      background: linear-gradient(135deg, #cce7ff 0%, #b3d9ff 100%);
      border: 1px solid #b3d9ff;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #004085;
    }

    /* Dark mode styles */
    body.dark-mode #custom-confirmation-modal .modal-content {
      background: #23272b;
      color: #fff;
    }

    body.dark-mode #custom-confirmation-modal .modal-header {
      background: linear-gradient(135deg, #343a40 0%, #23272b 100%);
      border-bottom: 1px solid #444;
    }

    body.dark-mode #custom-confirmation-modal .modal-title {
      color: #fff;
    }

    body.dark-mode #custom-confirmation-modal .modal-body {
      background: #23272b;
      color: #fff;
    }

    body.dark-mode #custom-confirmation-modal .modal-footer {
      background: #1e2228;
      border-top: 1px solid #444;
    }

    body.dark-mode #custom-confirmation-modal .alert-primary {
      background: linear-gradient(135deg, #1a3a52 0%, #2a4a62 100%);
      border-color: #007bff;
      color: #9fc5e8;
    }

    body.dark-mode #custom-confirmation-modal .btn-close {
      filter: invert(1);
    }
  `;
  document.head.appendChild(confirmationModalStyles);

  // Enhanced confirmation function
  function showConfirmationModal(message, confirmText = 'Potrdi brisanje', onConfirm = null) {
    return new Promise((resolve) => {
      const modal = createConfirmationModal();
      const messageElement = document.getElementById('confirmation-message');
      const confirmBtn = document.getElementById('confirm-action-btn');
      
      // Set custom message
      messageElement.textContent = message;
      
      // Set custom confirm button text
      confirmBtn.innerHTML = `<i class="bi bi-trash-fill me-1"></i>${confirmText}`;
      
      // Handle confirm action
      const handleConfirm = () => {
        resolve(true);
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
          bsModal.hide();
        }
      };
      
      // Handle cancel action
      const handleCancel = () => {
        resolve(false);
      };
      
      // Remove old event listeners
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      
      // Add event listeners
      newConfirmBtn.addEventListener('click', handleConfirm);
      modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
        handleCancel();
      });
      
      // Show modal
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    });
  }
