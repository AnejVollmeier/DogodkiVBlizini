(function () {
  'use strict'
  const forms = document.querySelectorAll('.needs-validation')
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }
      // Preveri geslo in potrditev gesla
      const geslo = document.getElementById('geslo');
      const potrdiGeslo = document.getElementById('potrdi-geslo');
      if (geslo.value !== potrdiGeslo.value) {
        potrdiGeslo.setCustomValidity('Gesli se ne ujemata!');
        potrdiGeslo.reportValidity();
        event.preventDefault();
        event.stopPropagation();
      } else {
        potrdiGeslo.setCustomValidity('');
      }
      form.classList.add('was-validated')
    }, false)
  })
})()

// Add validation constraints to form fields
document.addEventListener('DOMContentLoaded', function() {
  // Set maxlength constraints for all form fields
  const imeInput = document.getElementById('ime');
  if (imeInput) {
    imeInput.setAttribute('maxlength', '45');
    imeInput.setAttribute('required', '');
  }
  
  const priimekInput = document.getElementById('priimek');
  if (priimekInput) {
    priimekInput.setAttribute('maxlength', '45');
    priimekInput.setAttribute('required', '');
  }
  
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.setAttribute('maxlength', '100');
    emailInput.setAttribute('required', '');
  }
  
  const gesloInput = document.getElementById('geslo');
  if (gesloInput) {
    gesloInput.setAttribute('maxlength', '500');
    gesloInput.setAttribute('required', '');
  }
  
  const potrdiGesloInput = document.getElementById('potrdi-geslo');
  if (potrdiGesloInput) {
    potrdiGesloInput.setAttribute('maxlength', '500');
    potrdiGesloInput.setAttribute('required', '');
  }
  
  // Add custom validation messages
  imeInput?.addEventListener('input', function() {
    if (this.value.length > 45) {
      this.setCustomValidity('Ime ne sme presegati 45 znakov');
    } else {
      this.setCustomValidity('');
    }
  });
  
  priimekInput?.addEventListener('input', function() {
    if (this.value.length > 45) {
      this.setCustomValidity('Priimek ne sme presegati 45 znakov');
    } else {
      this.setCustomValidity('');
    }
  });
  
  emailInput?.addEventListener('input', function() {
    if (this.value.length > 100) {
      this.setCustomValidity('Email ne sme presegati 100 znakov');
    } else {
      this.setCustomValidity('');
    }
  });
});

// Constants
const ITEMS_PER_PAGE = 12;

// Add search form handler
document.getElementById('searchForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('currentPage').value = 1;
  loadUsers();
});

// Add filter form handlers
document.getElementById('filterForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('currentPage').value = 1;
  loadUsers();
});

document.getElementById('filterForm')?.addEventListener('reset', (e) => {
  e.preventDefault();
  document.getElementById('userType').value = ''; // Reset the select
  document.getElementById('currentPage').value = 1;
  loadUsers();
});

// Ponastavitev obrazca
if (document.getElementById('reset-form')) {
  document.getElementById('reset-form').addEventListener('click', function() {
    const form = document.getElementById('uporabnik-form');
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('uporabnik-id').value = '';
    document.getElementById('form-title').textContent = 'Nov uporabnik';
    // Reset submit button text
    document.querySelector('#uporabnik-form button[type="submit"]').textContent = 'Shrani uporabnika';
    // Ensure password fields are required for new user
    form.querySelector('#geslo').required = true;
    form.querySelector('#potrdi-geslo').required = true;
    const pwdGroup = document.getElementById('password-group');
    if (pwdGroup) pwdGroup.style.display = 'block';
    // Clear user events container
    const eventsContainer = document.getElementById('user-events-container');
    if (eventsContainer) eventsContainer.innerHTML = '';
  });
}

// Bootstrap alerts
function showAlert(message, type = 'success', formId = 'uporabnik-form') {
  showAlertWithFadeAnimation(message, type, formId);
}

// Custom CSS for simple animations
const simpleAnimationStyles = document.createElement('style');
simpleAnimationStyles.textContent = `
  .fade-in {
    animation: fadeIn 0.5s ease-in;
  }

  .fade-out {
    animation: fadeOut 0.5s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }

  .success-message {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border: 1px solid #c3e6cb;
    color: #155724;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;
document.head.appendChild(simpleAnimationStyles);

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
      if (onConfirm) onConfirm();
      resolve(true);
      bootstrap.Modal.getInstance(modal).hide();
    };
    
    // Handle cancel action
    const handleCancel = () => {
      resolve(false);
      bootstrap.Modal.getInstance(modal).hide();
    };
    
    // Remove old event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add event listeners
    newConfirmBtn.addEventListener('click', handleConfirm);
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  });
}

// Enhanced showAlert function with fade animations
function showAlertWithFadeAnimation(message, type = 'success', formId = 'uporabnik-form') {
  // Remove any existing alerts
  removeAlertMessages();

  const form = document.getElementById(formId);
  const alert = document.createElement('div');
  
  const alertClass = type === 'success' ? 'success-message' : `alert-${type}`;
  alert.className = `alert ${alertClass} mt-3 alert-dismissible fade-in`;
    alert.innerHTML = `
    <i class="bi bi-check-circle-fill me-2"></i>
    ${encodeInput(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Insert alert at the beginning of the form
  form.firstElementChild.before(alert);

  // Auto-remove after 3 seconds with fade animation
  setTimeout(() => {
    if (alert && alert.parentNode) {
      alert.classList.remove('fade-in');
      alert.classList.add('fade-out');
      
      // Remove element after fade out animation
      setTimeout(() => {
        if (alert.parentNode) {
          alert.remove();
        }
      }, 500);
    }
  }, 3000);
}

// Function to remove any existing alerts
function removeAlertMessages() {
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
}

// Function to show loading message with spinner
function showLoadingMessage(formId) {
  // Remove any existing alerts or loading messages
  removeAlertMessages();
  
  const form = document.getElementById(formId);
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-message text-center py-3 mt-3';
  loadingDiv.innerHTML = `
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Nalaganje...</span>
    </div>
    <p class="mt-2 text-muted">Shranjujem podatke, prosimo počakajte...</p>
  `;
  
  form.firstElementChild.before(loadingDiv);
}

// Function to remove loading message
function removeLoadingMessage() {
  // Remove any existing loading messages
  const existingLoadingMessages = document.querySelectorAll('.loading-message');
  existingLoadingMessages.forEach(msg => msg.remove());
}

// Handle User Form Submission (Create/Update)
document.getElementById('uporabnik-form')?.addEventListener('submit', async function(event) {
  event.preventDefault();
  event.stopPropagation();

  const form = event.target;
  const userId = document.getElementById('uporabnik-id').value;
  const gesloInput = form.querySelector('#geslo');
  const potrdiGesloInput = form.querySelector('#potrdi-geslo');
  
  // Get form values for validation
  const ime = form.querySelector('#ime').value;
  const priimek = form.querySelector('#priimek').value;
  const email = form.querySelector('#email').value;
  const geslo = gesloInput.value;

  // Validate field lengths directly
  if (ime.length > 45) {
    showAlert('Ime ne sme presegati 45 znakov.', 'danger');
    return;
  }
  if (priimek.length > 45) {
    showAlert('Priimek ne sme presegati 45 znakov.', 'danger');
    return;
  }
  if (email.length > 100) {
    showAlert('Email ne sme presegati 100 znakov.', 'danger');
    return;
  }
  if (geslo && geslo.length > 500) {
    showAlert('Geslo ne sme presegati 500 znakov.', 'danger');
    return;
  }

  // Custom validation for password match
  if (userId || gesloInput.value) { // Only validate password if new user or password is being changed
    if (gesloInput.value !== potrdiGesloInput.value) {
      potrdiGesloInput.setCustomValidity('Gesli se ne ujemata!');
    } else {
      potrdiGesloInput.setCustomValidity('');
    }
  }

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }
  form.classList.add('was-validated');
  // Show loading spinner
  showLoadingMessage('uporabnik-form');
  
  // Sanitize input values to prevent XSS attacks
  const sanitizedFirstName = ime.replace(/[^\p{L}0-9 ]/gu, '');
  const sanitizedLastName = priimek.replace(/[^\p{L}0-9 ]/gu, '');
  const sanitizedEmail = email.replace(/[^\p{L}0-9@._-]/gu, '');
  const sanitizedBirthDate = form.querySelector('#datum-rojstva').value.replace(/[^0-9-]/g, '');
  const sanitizedPassword = geslo.replace(/[^\p{L}0-9!@#$%^&*()_+]/gu, '');
  
  const formData = new FormData();
  formData.append('ime', sanitizedFirstName);
  formData.append('priimek', sanitizedLastName);
  formData.append('email', sanitizedEmail);
  formData.append('datum-rojstva', sanitizedBirthDate);
  if (geslo) {
    formData.append('geslo', sanitizedPassword);
  }
  formData.append('tip-uporabnika', form.querySelector('#tip-uporabnika').value);
  
  // Handle profile image file
  const slikaFile = form.querySelector('#slika').files[0];
  if (slikaFile) {
    formData.append('slika', slikaFile);
  }
  const token = localStorage.getItem('userToken');
  let url = '';
  let method = '';
  if (userId) {
    // Update existing user
    url = `${CONFIG.API_BASE_URL}/users/edit/${userId}`;
    method = 'POST';
    // If password fields are empty, remove them from FormData so they are not updated
    if (!gesloInput.value) {
      formData.delete('geslo');
    }

    formData.delete('potrdi-geslo');
    
    // Map field names for editing existing user (backend expects underscore format)
    formData.set('tip_uporabnika', formData.get('tip-uporabnika'));
    formData.set('datumRojstva', formData.get('datum-rojstva'));
  } else {
    // Create new user - use the /register endpoint as it handles hashing and full user creation
    url = `${CONFIG.API_BASE_URL}/users/register`;
    method = 'POST';
    
    // Map field names for new user registration
    formData.set('tip_uporabnika', formData.get('tip-uporabnika'));
    formData.set('datumRojstva', formData.get('datum-rojstva'));
  }

  try {
    const response = await fetch(url, {
      method: method,
      body: formData,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    const result = await response.json();
    
    if (response.ok) {
      setTimeout(() => {
        // Remove loading message
        removeLoadingMessage();
        
        showAlert(userId ? 'Uporabnik uspešno posodobljen!' : 'Uporabnik uspešno ustvarjen!', 'success');
        document.getElementById('reset-form').click();
        loadUsers();
      }, 1000);
    } else {
      removeLoadingMessage();
      showAlert(`Napaka: ${result.error || 'Prišlo je do napake.'}`, 'danger');
    }} catch (error) {
    removeLoadingMessage();
    
    console.error('Error submitting user form:', error);
    showAlert('Prišlo je do napake pri komunikaciji s strežnikom.', 'danger');
  }
});

// Load and render users
async function loadUsers() {
  const tbody = document.querySelector('.upcoming-events tbody');
  tbody.innerHTML = '';

  // Show loading spinner
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Nalaganje...</span>
        </div>
        <p class="mt-2 text-muted">Nalaganje uporabnikov...</p>
      </td>
    </tr>
  `;

  const token = localStorage.getItem('userToken');
  try {
    // Get current page from input
    const currentPage = parseInt(document.getElementById('currentPage').value) || 1;

    // Build query parameters
    const params = new URLSearchParams({
      page: currentPage,
      limit: ITEMS_PER_PAGE
    });

    // Add search parameter
    const searchInput = document.getElementById('searchInput')?.value.trim();
    if (searchInput) {
      params.append('search', searchInput);
    }

    // Add filter parameter
    const userType = document.getElementById('userType')?.value;
    if (userType) {
      params.append('tip_uporabnika', userType);
    }

    const res = await fetch(`${CONFIG.API_BASE_URL}/users?${params.toString()}`, { 
      headers: token ? { Authorization: `Bearer ${token}` } : {} 
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const { users, total } = await res.json();
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <p class="text-muted mb-0">Ni najdenih uporabnikov.</p>
          </td>
        </tr>
      `;
      return;
    }    users.forEach(u => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${encodeInput(u.idUporabnik)}</td>
        <td>${encodeInput(u.ime)}</td>
        <td>${encodeInput(u.priimek)}</td>
        <td>${encodeInput(u.email)}</td>
        <td>${encodeInput(u.tip_uporabnika)}</td>        <td class="text-center">
          <div class="btn-group-action d-flex flex-wrap gap-1 justify-content-center">
            <button class="btn btn-sm btn-${u.is_banned ? 'success' : 'danger'} btn-ban action-btn" 
                    data-id="${encodeInput(u.idUporabnik)}"
                    data-bs-toggle="tooltip" 
                    data-bs-placement="top" 
                    title="${u.is_banned ? 'Odblokiraj uporabnika' : 'Blokiraj uporabnika'}">
              <i class="bi bi-${u.is_banned ? 'unlock' : 'lock'}"></i>
              <span class="d-none d-xl-inline ms-1">${u.is_banned ? 'Odblokiraj' : 'Ban'}</span>
            </button>
            <button class="btn btn-sm btn-warning btn-edit action-btn" 
                    data-id="${encodeInput(u.idUporabnik)}"
                    data-bs-toggle="tooltip" 
                    data-bs-placement="top" 
                    title="Uredi uporabnika">
              <i class="bi bi-pencil-fill"></i>
              <span class="d-none d-xl-inline ms-1">Uredi</span>
            </button>            <button class="btn btn-sm btn-danger btn-delete action-btn"
                    data-id="${encodeInput(u.idUporabnik)}"
                    data-bs-toggle="tooltip" 
                    data-bs-placement="top" 
                    title="Izbriši uporabnika">
              <i class="bi bi-trash-fill"></i>
              <span class="d-none d-xl-inline ms-1">Izbriši</span>
            </button>
          </div>
        </td>`;
      tbody.appendChild(row);
    });

    // Update pagination
    updatePagination(total, currentPage);
    attachActionHandlers(tbody, token);

    // Initialize tooltips for action buttons
    initializeTooltips();

  } catch (error) {
    console.error('Napaka pri nalaganju uporabnikov:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <div class="alert alert-danger mb-0">
            <i class="bi bi-exclamation-triangle-fill"></i> Napaka pri nalaganju uporabnikov.
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
        loadUsers();
      }
    });
  });
}

// Function to attach action handlers
function attachActionHandlers(tbody, token) {
  // Ban/Unban handler
  tbody.querySelectorAll('.btn-ban').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        const r = await fetch(`${CONFIG.API_BASE_URL}/users/ban/${id}`, { 
          method: 'PUT', 
          headers: token ? { Authorization: `Bearer ${token}` } : {} 
        });
        const res = await r.json();
        if (r.ok) {
          showAlert('Status uporabnika uspešno spremenjen.', 'success');
          loadUsers();
        } else {
          showAlert(res.error || 'Napaka pri spreminjanju statusa uporabnika.', 'danger');
        }
      } catch (error) {
        console.error('Error banning/unbanning user:', error);
        showAlert('Napaka pri spreminjanju statusa uporabnika.', 'danger');
      }
    });
  });

  // Delete handler
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      // Custom confirmation modal
      showConfirmationModal('Ste prepričani, da želite izbrisati tega uporabnika?', 'Izbriši uporabnika', async () => {
        try {
          const r = await fetch(`${CONFIG.API_BASE_URL}/users/${id}`, { 
            method: 'DELETE', 
            headers: token ? { Authorization: `Bearer ${token}` } : {} 
          });
          const res = await r.json();
          if (r.ok) {
            showAlert('Uporabnik uspešno izbrisan.', 'success');
            loadUsers();
          } else {
            showAlert(res.error || 'Napaka pri brisanju uporabnika.', 'danger');
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          showAlert('Napaka pri brisanju uporabnika.', 'danger');
        }
      });
    });
  });

  // Edit handler
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const uporabnikForm = document.getElementById('uporabnik-form');
      if (!uporabnikForm) {
        console.error('User form not found!');
        showAlert('Napaka: Obrazec za urejanje uporabnika ni najden.', 'danger');
        return;
      }

      try {
        const r = await fetch(`${CONFIG.API_BASE_URL}/users/${id}/public`, { 
          headers: token ? { Authorization: `Bearer ${token}` } : {} 
        });
        
        if (!r.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const u = await r.json();

        document.getElementById('uporabnik-id').value = u.idUporabnik;
        document.getElementById('form-title').textContent = 'Uredi uporabnika';
        uporabnikForm.querySelector('button[type="submit"]').textContent = 'Posodobi uporabnika';
        uporabnikForm.querySelector('#ime').value = u.ime;
        uporabnikForm.querySelector('#priimek').value = u.priimek;
        uporabnikForm.querySelector('#email').value = u.email;
        
        if (u.datum_rojstva) {
          const date = new Date(u.datum_rojstva);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          uporabnikForm.querySelector('#datum-rojstva').value = `${year}-${month}-${day}`;
        } else {
          uporabnikForm.querySelector('#datum-rojstva').value = '';
        }
        
        uporabnikForm.querySelector('#tip-uporabnika').value = u.tip_uporabnika;

        const pwdGroup = document.getElementById('password-group');
        if (pwdGroup) pwdGroup.style.display = 'none';

        uporabnikForm.querySelector('#geslo').required = false;
        uporabnikForm.querySelector('#potrdi-geslo').required = false;
        uporabnikForm.classList.remove('was-validated');

        // Load and display user's events
        loadUserEvents(id);
      } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('Napaka pri nalaganju podatkov uporabnika.', 'danger');
      }
    });
  });
}

// Function to load and display user's events
async function loadUserEvents(userId) {
  const eventsContainer = document.getElementById('user-events-container');
  if (!eventsContainer) return;

  // Clear previous content and add a card structure for better styling
  eventsContainer.innerHTML = `
    <div class="card shadow-sm mt-4">
      <div class="card-header bg-primary text-white">
        <h4 class="h5 mb-0"><i class="bi bi-person-lines-fill me-2"></i>Dogodki uporabnika</h4>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover table-striped">
            <thead class="table-light">
              <tr>
                <th>Naslov</th>
                <th>Tip dogodka</th>
                <th>Lokacija</th>
                <th>Datum in čas</th>
                <th class="text-center">Akcije</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" class="text-center py-4">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Nalaganje...</span>
                  </div>
                  <p class="mt-2 text-muted">Nalaganje dogodkov uporabnika...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const token = localStorage.getItem('userToken');
    const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user events');
    }

    const events = await response.json();
    const tbody = eventsContainer.querySelector('tbody');
    tbody.innerHTML = ''; // Clear spinner

    if (!events || events.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <div class="alert alert-info mb-0"><i class="bi bi-info-circle me-2"></i>Uporabnik nima dogodkov.</div>
          </td>
        </tr>
      `;
      return;
    }

    events.forEach(event => {
      const row = document.createElement('tr');
      const eventDate = new Date(event.cas);
      const formattedDate = eventDate.toLocaleString('sl-SI', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });      row.innerHTML = `
        <td>${encodeInput(event.naziv || '-')}</td>
        <td>${encodeInput(event.tipDogodka?.naziv || 'Neznan tip')}</td>
        <td>${event.naslov ? `${encodeInput(event.naslov.ulica || '')} ${encodeInput(event.naslov.hisna_stevilka || '')}, ${encodeInput(event.naslov.kraj || event.naslov.obcina || '')}` : 'Ni podatka'}</td>
        <td>${encodeInput(formattedDate)}</td>
        <td class="text-center">
          <a href="upravljanje_dogodkov.html?id=${encodeInput(event.idDogodek)}" class="btn btn-sm btn-warning me-1" title="Uredi dogodek">
            <i class="bi bi-pencil-fill"></i> <span class="d-none d-md-inline">Uredi</span>
          </a>
          <button class="btn btn-sm btn-danger btn-delete-event" data-id="${encodeInput(event.idDogodek)}" title="Izbriši dogodek">
            <i class="bi bi-trash-fill"></i> <span class="d-none d-md-inline">Izbriši</span>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });    // Add event handlers for delete buttons
    tbody.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', async () => {
        const eventId = btn.dataset.id;
        
        // Use custom confirmation modal for event deletion
        showConfirmationModal(
          'Ali ste prepričani, da želite izbrisati ta dogodek? Ta akcija bo trajno odstranila dogodek in vse povezane podatke.',
          'Izbriši dogodek',
          async () => {            try {
              const token = localStorage.getItem('userToken');
              const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/${eventId}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });

              if (!response.ok) {
                throw new Error('Failed to delete event');
              }

              showAlert('Dogodek uspešno izbrisan.', 'success');
              loadUserEvents(userId); // Reload events after deletion
            } catch (error) {
              console.error('Error deleting event:', error);
              showAlert('Napaka pri brisanju dogodka.', 'danger');
            }
          }
        );
      });
    });

  } catch (error) {
    console.error('Napaka pri nalaganju dogodkov uporabnika:', error);
    const cardBody = eventsContainer.querySelector('.card-body');
    if (cardBody) {
        cardBody.innerHTML = `
        <div class="alert alert-danger mt-4">
            <i class="bi bi-exclamation-triangle-fill me-2"></i> Napaka pri nalaganju dogodkov uporabnika.
        </div>
        `;
    } else {
        eventsContainer.innerHTML = `
        <div class="alert alert-danger mt-4">
            <i class="bi bi-exclamation-triangle-fill me-2"></i> Napaka pri nalaganju dogodkov uporabnika.
        </div>
        `;
    }
  }
}

// Function to initialize tooltips
function initializeTooltips() {
  // Dispose existing tooltips first
  const existingTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  existingTooltips.forEach(element => {
    const tooltip = bootstrap.Tooltip.getInstance(element);
    if (tooltip) {
      tooltip.dispose();
    }
  });

  // Initialize new tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, {
      trigger: 'hover',
      delay: { show: 300, hide: 100 }
    });
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', loadUsers);
