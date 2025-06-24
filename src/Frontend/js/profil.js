document.addEventListener('DOMContentLoaded', function() {
    // Custom CSS for simple animations (consistent with upravljanje_uporabnikov.js)
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

    // Extract user ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const profileUserId = urlParams.get('userId');
    
    // Check ownership
    const token = localStorage.getItem('userToken');
    const currentUserId = token ? parseJwt(token).idUporabnik : null;
    const isOwner = !profileUserId || currentUserId === parseInt(profileUserId, 10);
    
    // Toggle UI elements
    document.querySelectorAll('.owner-only').forEach(el => {
        el.classList.toggle('d-none', !isOwner);
        el.classList.toggle('d-block', isOwner);
    });
    document.querySelector('.public-view-message').classList.toggle('d-none', isOwner);

    // If viewing someone else's profile, make statistics card full width
    if (!isOwner) {
        const statsCard = document.getElementById('statistika-dogodkov');
        if (statsCard) {
            statsCard.classList.remove('col-lg-7');
            statsCard.classList.add('col-lg-12');
        }
    }

    // Load appropriate profile
    if (profileUserId && !isOwner) {
        loadPublicProfile(profileUserId);
        loadPublicStatistics(profileUserId);
        // Call functions to load public favorites for the viewed user
        loadPublicFavoriteEvents(profileUserId);
        loadPublicFavoriteOrganizers(profileUserId);

    } else {
        // Preveri, če je uporabnik prijavljen
        checkLoggedInStatus();
            
        // Pridobi podatke o uporabniku iz API-ja in jih prikaži
        loadUserProfile();

        // Pridobi in prikaži statistiko uporabnika
        loadUserStatistics();

        // Pridobi in prikaži prijavljene dogodke
        loadUserEvents();

        // Pridobi in prikaži priljubljene dogodke in organizatorje
        loadFavoriteEvents();
        loadFavoriteOrganizers();

        // Poslušaj za spremembe obrazca
        setupFormListeners();
    }

    async function loadPublicProfile(userId) {
        try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}/public`);
        const userData = await response.json();
        displayPublicProfile(userData);
        } catch (error) {
        console.error('Error loading public profile:', error);
        }
    }

    function displayPublicProfile(userData) {
        displayUserProfile(userData, true);
        // Hide sensitive info
        document.querySelectorAll('[id^="input"]').forEach(input => {
        input.parentElement.classList.add('d-none');
        });
    }

    async function loadPublicStatistics(userId) {
        try {
          const response = await fetch(`${CONFIG.API_BASE_URL}/users/statistics/${userId}`);
          if (!response.ok) {
            throw new Error(`Napaka pri pridobivanju statistike: ${response.status}`);
            }

          const statistics = await response.json();
          updateStatisticsUI(statistics);
        } catch (error) {
          console.error('Error loading public statistics:', error);
        }
      }

    // Function to check if user is logged in
    function checkLoggedInStatus() {
        const token = localStorage.getItem('userToken');
        if (!token) {
            // Če uporabnik ni prijavljen, ga preusmeri na prijavo
            window.location.href = 'prijava.html';
        }
    }    
    function setupFormListeners() {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo.is_banned) {
                    console.log('Uporabnik je baniran - poslušalci obrazca niso nastavljeni');
                    return; 
                }
            }
        } catch (error) {
            console.error('Napaka pri preverjanju statusa bana:', error);
        }
        
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveUserProfile();
            });
        }
        
        const removeProfilePicBtn = document.getElementById('remove-profile-pic');
        if (removeProfilePicBtn) {
            removeProfilePicBtn.addEventListener('click', function() {
                    removeProfilePicture();
            });
        }
        
        const fileInput = document.getElementById('slika');
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) {
                    const removeProfilePicBtn = document.getElementById('remove-profile-pic');
                    if (removeProfilePicBtn) {
                        removeProfilePicBtn.classList.remove('d-none');
                    }
                }
            });
        }
    }
    
    // Funkcija za nalaganje podatkov uporabnika
    async function loadUserProfile() {
        const token = localStorage.getItem('userToken');
        if (!token) {
            console.warn("Token ni najden v localStorage");
            return;
        }
        
        try {
            // Pridobi podrobne podatke iz API-ja
            const userData = await fetchUserData(token);
            
            if (!userData) {
                console.error("Napaka pri pridobivanju podatkov uporabnika");
                return;
            }
            
            console.log("Pridobljeni podatki uporabnika:", userData);
            
            // Prikaži podatke v profilu
            displayUserProfile(userData);
            
        } catch (error) {
            console.error('Napaka pri nalaganju profila:', error);
        }
    }

    // Funkcija za pridobivanje podatkov iz API-ja
    async function fetchUserData(token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Napaka pri pridobivanju podatkov: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Napaka pri pridobivanju podatkov:", error);
            return null;
        }
    }    // Funkcija za prikaz podatkov uporabnika v profilu    function displayUserProfile(userData, isPublic = false) {
        // Nastavi ime in priimek v glavi profila
            function displayUserProfile(userData, isPublic = false) {
        // Nastavi ime in priimek v glavi profila
        const profileName = document.querySelector('.profile-header h1');
        if (profileName) {
            let nameText = `${userData.ime || ''} ${userData.priimek || ''}`.trim();
            if (!nameText) nameText = userData.email || 'Uporabnik';
            
            // Sanitize
            const nameTextSanitized = encodeInput(nameText);

            // Nastavi ime
            profileName.innerHTML = `
                ${nameTextSanitized}
                <span class="badge ${getBadgeClass(userData.tip_uporabnika)} d-flex align-items-center">
                    ${getUserTypeIcon(userData.tip_uporabnika)} ${userData.tip_uporabnika || 'Obiskovalec'}
                </span>
            `;
        }        
        if (userData.is_banned) {
            const bannedContainer = document.getElementById('banned-indicator-container');
            if (bannedContainer) {
                bannedContainer.innerHTML = '';
            }
            
            const profileForm = document.getElementById('profile-form');
            if (profileForm && !isPublic) {
                const inputs = profileForm.querySelectorAll('input, button');
                inputs.forEach(input => {
                    input.disabled = true;
                });
                
                const profilePictureSection = document.getElementById('profile-picture-section');
                if (profilePictureSection) {
                    const fileInput = profilePictureSection.querySelector('#slika');
                    const bannedMessage = profilePictureSection.querySelector('.banned-profile-message');
                    const validFeedback = profilePictureSection.querySelector('.valid-feedback');
                    
                    if (fileInput) fileInput.classList.add('d-none');
                    if (bannedMessage) bannedMessage.classList.remove('d-none');
                    if (validFeedback) validFeedback.classList.add('d-none');
                }
                
                const formContainer = profileForm.parentElement;
                if (formContainer && !formContainer.querySelector('.banned-warning')) {
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'alert alert-danger banned-warning mb-3';
                    warningDiv.innerHTML = `
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <strong>Račun je blokiran:</strong> Ne morete urejati svojih podatkov dokler je vaš račun blokiran.
                    `;
                    formContainer.insertBefore(warningDiv, profileForm);
                }
            }
        } else {
            const bannedContainer = document.getElementById('banned-indicator-container');
            if (bannedContainer) {
                bannedContainer.innerHTML = '';
            }
            
            const warningDiv = document.querySelector('.banned-warning');
            if (warningDiv) {
                warningDiv.remove();
            }
            
            const profilePictureSection = document.getElementById('profile-picture-section');
            if (profilePictureSection) {
                const fileInput = profilePictureSection.querySelector('#slika');
                const bannedMessage = profilePictureSection.querySelector('.banned-profile-message');
                const validFeedback = profilePictureSection.querySelector('.valid-feedback');
                
                if (fileInput) fileInput.classList.remove('d-none');
                if (bannedMessage) bannedMessage.classList.add('d-none');
                if (validFeedback) validFeedback.classList.remove('d-none');
            }
        }
        
        // Nastavi email, lokacijo in datum registracije
        const emailElement = document.querySelector('.profile-header p:nth-child(2)');
        if (emailElement) {
            emailElement.innerHTML = `<i class="bi bi-envelope"></i> ${encodeInput(userData.email) || ''}`;
        }
        
        // Nastavi lokacijo (če je na voljo)
        const locationElement = document.querySelector('.profile-header p:nth-child(3)');
        if (locationElement) {
            const location = userData.obcina ? `${userData.obcina}, Slovenija` : 'Ni podatka';
            locationElement.innerHTML = `<i class="bi bi-geo-alt"></i> ${location}`;
        }
        
        // Nastavi datum registracije (če je na voljo)
        const memberSinceElement = document.querySelector('.profile-header p:nth-child(4)');
        if (memberSinceElement) {
            const createdAt = userData.created_at ? formatDate(userData.created_at) : 'Ni podatka';
            memberSinceElement.innerHTML = `<i class="bi bi-calendar3"></i> Član od: ${createdAt}`;
        }        const profileImg = document.querySelector('.profile-img img');
        if (profileImg) {
            if (userData.is_banned) {
                profileImg.src = 'images/ban-img.gif';
                profileImg.title = 'Ta uporabnik je blokiran';
                profileImg.style.border = '3px solid #dc3545';
            } else if (userData.slika) {
                profileImg.src = userData.slika;
                profileImg.title = '';
                profileImg.style.border = '3px solid #ddd';
            } else {
                profileImg.src = 'images/profile-placeholder.png';
                profileImg.title = '';
                profileImg.style.border = '3px solid #ddd';
            }
        }
        
        const removeProfilePicBtn = document.getElementById('remove-profile-pic');
        if (removeProfilePicBtn) {
            if (userData.is_banned) {
                removeProfilePicBtn.classList.add('d-none');
            } else if (userData.slika) {
                removeProfilePicBtn.classList.remove('d-none');
            } else {
                removeProfilePicBtn.classList.add('d-none');
            }
        }
        
        if (!isPublic) {
            setFormValues(userData);
        }
        else
        {
            // change the statistics title
            const statsTitle = document.getElementById('statistika-dogodkov-title');
            statsTitle.innerHTML = `<i class="bi bi-bar-chart-line"></i> Statistika dogodkov`;
        }
    }
    
    // Funkcija za nastavljanje vrednosti obrazca
    function setFormValues(userData) {
        // Osnovni podatki uporabnika
        const inputName = document.getElementById('inputName');
        const inputSurname = document.getElementById('inputSurname');
        const inputEmail = document.getElementById('inputEmail');
        const inputBirthday = document.getElementById('inputBirthday');
        
        if (inputName) inputName.value = userData.ime || '';
        if (inputSurname) inputSurname.value = userData.priimek || '';
        if (inputEmail) inputEmail.value = userData.email || '';
        if (inputBirthday && userData.datum_rojstva) {
            inputBirthday.value = formatDateForInput(userData.datum_rojstva);
        }
       
    }

    function validateForm() {
        const firstName = document.getElementById('inputName').value.trim();
        const lastName = document.getElementById('inputSurname').value.trim();
        const email = document.getElementById('inputEmail').value.trim();
        const password = document.getElementById('inputPassword').value;
        const confirmPassword = document.getElementById('inputPasswordConfirm').value;
        
        // Reset previous error messages
        clearErrors();
        
        let isValid = true;
        
        // Validate first name
        if (firstName.length > 30) {
            showFieldError('inputName', 'Ime ne sme presegati 30 znakov.');
            isValid = false;
        }
        
        // Validate last name
        if (lastName.length > 30) {
            showFieldError('inputSurname', 'Priimek ne sme presegati 30 znakov.');
            isValid = false;
        }
        
        // Validate email
        if (email) {
            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
            if (!emailRegex.test(email)) {
                showFieldError('inputEmail', 'Vnesite veljaven email naslov.');
                isValid = false;
            }
            if (email.length > 99) {
                showFieldError('inputEmail', 'Email ne sme presegati 100 znakov.');
                isValid = false;
            }
        }
        
        // Validate password (at least 6 characters)
        if (password)
        {
            if (password.length < 6) {
                showFieldError('inputPassword', 'Geslo mora vsebovati vsaj 6 znakov.');
                isValid = false;
            }

            if (password !== confirmPassword) {
                showFieldError('inputPasswordConfirm', 'Gesli se ne ujemata.');
                isValid = false;
            }
        }
        
        return isValid;
    }

    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('is-invalid');
        
        // Find the invalid-feedback div
        let feedbackElement = field.nextElementSibling;
              
        if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
            feedbackElement.textContent = message;
        }
    }

        // Helper function to clear all error messages
        function clearErrors() {
            profileForm = document.getElementById('profile-form');
            const inputs = profileForm.querySelectorAll('input');
            inputs.forEach(input => {
                input.classList.remove('is-invalid');
            });
            
            // Remove any alert messages
            const existingAlerts = document.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());
        }
          // Helper function to show error message
        function showError(id, message) {
            clearErrors();
            
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            errorAlert.textContent = message;
            
            // Insert before form
            profileForm = document.getElementById(id);
            profileForm.parentNode.insertBefore(errorAlert, profileForm);
        }

        // Bootstrap alerts with consistent animations
        function showAlert(message, type = 'success', formId = 'profile-form') {
            showAlertWithFadeAnimation(message, type, formId);
        }

        // Function to remove any existing alerts
        function removeAlertMessages() {
            const existingAlerts = document.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());
        }

        // Enhanced showAlert function with fade animations (consistent with upravljanje_uporabnikov.js)
        function showAlertWithFadeAnimation(message, type = 'success', formId = 'profile-form') {
            // Remove any existing alerts
            removeAlertMessages();

            const form = document.getElementById(formId);
            const alert = document.createElement('div');
            
            const alertClass = type === 'success' ? 'success-message' : `alert-${type}`;
            alert.className = `alert ${alertClass} mt-3 alert-dismissible fade-in`;
            
            alert.innerHTML = `
                <i class="bi bi-check-circle-fill me-2"></i>
                ${message}
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
            }, 3000);        }    // Funkcija za shranjevanje profila
    async function saveUserProfile() {
        const token = localStorage.getItem('userToken');
        if (!token) {
            showAlert('Niste prijavljeni. Prosimo, prijavite se ponovno.', 'danger', 'profile-form');
            return;
        }
    
        try {
            const tokenData = parseJwt(token);
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo.is_banned) {
                    showAlert('Ne morete urejati svojih podatkov, ker je vaš račun blokiran.', 'warning', 'profile-form');
                    return;
                }
            }
        } catch (error) {
            console.error('Napaka pri preverjanju statusa bana:', error);
        }
        
        if (!validateForm())
        {
            return;
        }

        // Show loading message
        showLoadingMessage('profile-form');
        
        // Store original button text and disable the button
        const submitButton = document.querySelector('#profile-form button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Shranjujem...';

        const password = document.getElementById('inputPassword').value;  
        const ime = document.getElementById('inputName').value;
        const priimek = document.getElementById('inputSurname').value;
        const email = document.getElementById('inputEmail').value;
        const datumRojstva = document.getElementById('inputBirthday').value;

        // Sanitize fields
        const sanitizedFirstName = ime.replace(/[^\p{L}0-9 ]/gu, '');
        const sanitizedLastName = priimek.replace(/[^\p{L}0-9 ]/gu, '');
        const sanitizedEmail = email.replace(/[^\p{L}0-9@._-]/gu, '');
        const sanitizedBirthDate = datumRojstva.replace(/[^0-9-]/g, '');
        const sanitizedPassword = password.replace(/[^\p{L}0-9!@#$%^&*()_+]/gu, '');

        try {
            // Pridobi ID uporabnika iz tokena
            const tokenData = parseJwt(token);
            const userId = tokenData.idUporabnik;
            
            if (!userId) {
                throw new Error('ID uporabnika ni na voljo');
            }

            // Pripravi podatke iz obrazca
            const formData = new FormData();
            formData.append('ime', sanitizedFirstName);
            formData.append('priimek', sanitizedLastName);
            formData.append('email', sanitizedEmail);
            formData.append('datumRojstva', sanitizedBirthDate);
            
            // Dodaj geslo samo, če je vneseno
            if (sanitizedPassword) {
                formData.append('geslo', sanitizedPassword);
            }
            
            // Dodaj sliko, če je izbrana
            const fileInput = document.getElementById('slika');
            if (fileInput.files.length > 0) {
                formData.append('slika', fileInput.files[0]);
            }
              // Pošlji zahtevo za posodobitev profila
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Napaka pri posodabljanju profila');
            }
            
            // Use setTimeout for consistent 1-second delay like upravljanje_uporabnikov.js
            setTimeout(() => {
                // Remove loading message
                removeLoadingMessage();
                
                // Reset button
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                
                showAlert('Profil uspešno posodobljen!', 'success', 'profile-form');
                
                // Ponovno naloži podatke
                loadUserProfile();
            }, 1000);
              } catch (error) {       
            // Remove loading message in case of error too
            removeLoadingMessage();
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            
            showAlert(error.message || 'Napaka pri shranjevanju profila. Poskusite znova.', 'danger', 'profile-form');
        }
    }
      async function removeProfilePicture() {
        const token = localStorage.getItem('userToken');
        if (!token) {
            showAlert('Niste prijavljeni. Prosimo, prijavite se ponovno.', 'danger', 'profile-form');
            return;
        }
        
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo.is_banned) {
                    showAlert('Ne morete odstraniti profilne slike, ker je vaš račun blokiran.', 'warning', 'profile-form');
                    return;
                }
            }
        } catch (error) {
            console.error('Napaka pri preverjanju statusa bana:', error);
        }
        
        try {
            const tokenData = parseJwt(token);
            const userId = tokenData.idUporabnik;
            
            if (!userId) {
                throw new Error('ID uporabnika ni na voljo');
            }
            
            showLoadingMessage('profile-form');
            
            const removeButton = document.getElementById('remove-profile-pic');
            const originalButtonText = removeButton.innerHTML;
            removeButton.disabled = true;
            removeButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Odstranjujem...';
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}/profile-picture`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Napaka pri odstranjevanju profilne slike');
            }
            
            setTimeout(() => {
                removeLoadingMessage();
                
                removeButton.disabled = false;
                removeButton.innerHTML = originalButtonText;
                
                showAlert('Profilna slika uspešno odstranjena!', 'success', 'profile-form');
                
                document.getElementById('slika').value = '';
                
                const profileImg = document.querySelector('.profile-img img');
                if (profileImg) {
                    profileImg.src = 'images/profile-placeholder.png';
                }
                
                removeButton.classList.add('d-none');
                
                loadUserProfile();
            }, 1000);
            
        } catch (error) {
            removeLoadingMessage();
            
            const removeButton = document.getElementById('remove-profile-pic');
            removeButton.disabled = false;
            removeButton.innerHTML = '<i class="bi bi-trash"></i> Odstrani profilno sliko';
            
            showAlert(error.message || 'Napaka pri odstranjevanju profilne slike. Poskusite znova.', 'danger', 'profile-form');
        }
    }
    
    // Funkcija za nalaganje prijavljenih dogodkov
    async function loadUserEvents() {
        const token = localStorage.getItem('userToken');
        if (!token) {
            return;
        }
        
        try {
            // Prikaži indikator nalaganja
            const eventsTableBody = document.querySelector('.user-events-table tbody');
            if (eventsTableBody) {
                eventsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Nalaganje prijavljenih dogodkov...</span>
                            </div>
                            <p class="mt-2 text-muted">Nalaganje vaših prijavljenih dogodkov...</p>
                        </td>
                    </tr>
                `;
            }
            
            // Pridobi podatke o dogodkih, na katere je uporabnik prijavljen
            const response = await fetch(`${CONFIG.API_BASE_URL}/prijava/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Napaka pri pridobivanju prijavljenih dogodkov');
            }
            
            const prijave = await response.json();
            console.log("Pridobljene prijave:", prijave);
            
            // Če ni podatkov, prikaži ustrezno sporočilo
            if (!prijave || prijave.length === 0) {
                if (eventsTableBody) {
                    eventsTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-4">
                                <i class="bi bi-calendar-x fs-1 text-muted"></i>
                                <p class="mt-2">Trenutno niste prijavljeni na noben dogodek.</p>
                                <a href="dogodki.html" class="btn btn-primary mt-2">Razišči dogodke</a>
                            </td>
                        </tr>
                    `;
                }
                return;
            }
            
            // Generiraj vrstice za tabelo
            if (eventsTableBody) {
                let tableContent = '';
                
                for (const prijava of prijave) {
                    // Naložimo podatke o dogodku iz različnih možnih struktur odgovora API-ja
                    let dogodek;
                    
                    if (prijava.dogodek) {
                        // Če je dogodek že v prijava.dogodek
                        dogodek = prijava.dogodek;
                    } else if (prijava.attributes && prijava.attributes.dogodek) {
                        // Bookshelf včasih vrne podatke v attributes
                        dogodek = prijava.attributes.dogodek;
                    } else if (prijava.relations && prijava.relations.dogodek) {
                        // Bookshelf lahko tudi vrne podatke v relations
                        dogodek = prijava.relations.dogodek;
                    } else if (prijava.TK_dogodek) {
                        // Če imamo samo ID dogodka, potrebujemo dodatno poizvedbo (ne implementiramo zdaj)
                        console.warn("Samo ID dogodka je na voljo, manjkajo polni podatki:", prijava.TK_dogodek);
                        continue;
                    } else {
                        console.warn("Manjkajoči podatki o dogodku:", prijava);
                        continue;
                    }
                    
                    // Preskočimo če dogodek ni najden
                    if (!dogodek || (!dogodek.idDogodek && !dogodek.id)) {
                        console.warn("Manjkajoči podatki o dogodku:", dogodek);
                        continue;
                    }
                    
                    // Pridobi podatke o dogodku (poskusimo različne možne strukture)
                    const dogodekId = dogodek.idDogodek || dogodek.id;
                    const naslovDogodka = dogodek.naziv || dogodek.naslov_dogodka || 'Ni podatka';
                    
                    // Pridobi razred za značko tipa dogodka
                    let tipId = dogodek.TK_tip_dogodka;
                    if (!tipId && dogodek.tipDogodka) {
                        tipId = dogodek.tipDogodka.idTip_dogodka || dogodek.tipDogodka.id;
                    }
                    const badgeClass = getEventTypeBadgeClass(tipId);
                    
                    // Pridobi ime tipa dogodka iz različnih možnih struktur
                    let tipDogodka = 'Ni podatka';
                    if (dogodek.tipDogodka && dogodek.tipDogodka.naziv) {
                        tipDogodka = dogodek.tipDogodka.naziv;
                    } else if (dogodek.tip_dogodka && typeof dogodek.tip_dogodka === 'string') {
                        tipDogodka = dogodek.tip_dogodka;
                    }
                    
                    // Pridobi podatke o naslovu iz različnih možnih struktur
                    let naslovText = 'Ni podatka';
                    if (dogodek.naslov) {
                        const naslov = dogodek.naslov;
                        const ulica = naslov.ulica || '';
                        const hisna = naslov.hisna_stevilka || '';
                        const obcina = naslov.obcina || naslov.mesto || '';
                        naslovText = `${ulica} ${hisna}, ${obcina}`.trim();
                        if (naslovText === '') naslovText = 'Ni podatka';
                    } else if (dogodek.lokacija && typeof dogodek.lokacija === 'string') {
                        // Če je lokacija samo navaden tekst
                        naslovText = dogodek.lokacija;
                    }
                    
                    // Formatiraj datum in čas
                    const datumCas = dogodek.cas ? formatDateTimeForDisplay(dogodek.cas) : 'Ni podatka';
                    
                    tableContent += `
                        <tr>
                            <td>${naslovDogodka}</td>
                            <td><span class="badge ${badgeClass}">${tipDogodka}</span></td>
                            <td>${naslovText}</td>
                            <td>${datumCas}</td>
                            <td class="text-center">
                                <a href="podrobnosti_dogodka.html?id=${dogodekId}" class="btn btn-sm btn-light">
                                    <i class="bi bi-info-circle-fill"></i> Info
                                </a>
                                <button class="btn btn-sm btn-danger odjava-btn" data-dogodek-id="${dogodekId}">
                                    <i class="bi bi-x-circle-fill"></i> Odjava
                                </button>
                            </td>
                        </tr>
                    `;
                }
                
                eventsTableBody.innerHTML = tableContent;
                
                // Dodaj poslušalce za gumbe za odjavo
                document.querySelectorAll('.odjava-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const dogodekId = this.getAttribute('data-dogodek-id');
                        if (dogodekId) {
                            unregisterFromEvent(dogodekId);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Napaka pri nalaganju prijavljenih dogodkov:', error);
            
            // Prikaži sporočilo o napaki
            const eventsTableBody = document.querySelector('.user-events-table tbody');
            if (eventsTableBody) {
                eventsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4">
                            <div class="alert alert-danger" role="alert">
                                <i class="bi bi-exclamation-triangle-fill"></i>
                                Napaka pri nalaganju prijavljenih dogodkov. Poskusite znova.
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    /**
     * Odjavi uporabnika iz dogodka
     * @param {string} dogodekId - ID dogodka
     */
    async function unregisterFromEvent(dogodekId) {
        const token = localStorage.getItem('userToken');
        if (!token) {
            showError('upcoming-events', 'Za odjavo se morate prijaviti.');
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/prijava/${dogodekId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Napaka pri odjavi z dogodka');
            }
            
            showSuccessMessage('upcoming-events', 'Uspešno ste se odjavili z dogodka!');
            
            // Ponovno naloži prijavljene dogodke
            loadUserEvents();
            loadUserStatistics();
            
        } catch (error) {
            console.error('Napaka pri odjavi z dogodka:', error);
            showError('upcoming-events', 'Napaka pri odjavi z dogodka. Poskusite znova.');
        }
    }
    
    /**
     * Vrne razred za značko glede na tip dogodka
     * @param {string} tipId - ID tipa dogodka
     * @returns {string} - CSS razred za značko
     */
    function getEventTypeBadgeClass(tipId) {
        // Preslikava ID-jev tipov dogodkov v CSS razrede
        const badgeMap = {
            1: 'badge-koncert',
            2: 'badge-delavnica',
            3: 'badge-sport',
            4: 'badge-izobrazevanje',
            5: 'badge-sejem',
            6: 'badge-zabava'
        };
        
        return badgeMap[tipId] || 'badge-secondary';
    }
    
    /**
     * Formatira datum in čas za prikaz
     * @param {string} dateTimeString - Datum in čas v ISO formatu
     * @returns {string} - Formatiran datum in čas
     */
    function formatDateTimeForDisplay(dateTimeString) {
        if (!dateTimeString) return 'Ni podatka';
        
        try {
            const date = new Date(dateTimeString);
            
            const options = { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            return date.toLocaleDateString('sl-SI', options);
        } catch (error) {
            console.error('Napaka pri formatiranju datuma in časa:', error);
            return 'Ni podatka';
        }
    }
    
    // Pomožna funkcija za formatiranje datuma
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        try {
            return new Date(dateString).toLocaleDateString('sl-SI', options);
        } catch (error) {
            return 'Ni podatka';
        }
    }
      // Pomožna funkcija za formatiranje datuma v format za input type="date"
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            // Format as YYYY-MM-DD in local timezone to avoid timezone offset issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Napaka pri formatiranju datuma:', error);
            return '';
        }
    }
    
    // Pomožna funkcija za pridobivanje razreda značke glede na tip uporabnika
    function getBadgeClass(userType) {
        switch(userType) {
            case 'Administrator':
                return 'bg-warning';
            case 'Organizator':
                return 'bg-info text-white';
            default:
                return 'bg-secondary';
        }
    }
    
    // Pomožna funkcija za pridobivanje ikone glede na tip uporabnika
    function getUserTypeIcon(userType) {
        switch(userType) {
            case 'Administrator':
                return '<i class="bi bi-shield-lock-fill"></i>';
            case 'Organizator':
                return '<i class="bi bi-people-fill"></i>';
            default:
                return '<i class="bi bi-person-fill"></i>';
        }
    }

    
async function loadUserStatistics() {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
          // Če uporabnik ni prijavljen, ga preusmeri na prijavo
          window.location.href = 'prijava.html';
      }
      const tokenData = parseJwt(token);
      const userId = tokenData.idUporabnik;
      
      // Fetch statistics from the API
      const response = await fetch(`${CONFIG.API_BASE_URL}/users/statistics/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user statistics');
      }
      
      const statistics = await response.json();
      
      // Update the UI with statistics
      updateStatisticsUI(statistics);
      
    } catch (error) {
      console.error('Error loading user statistics:', error);
      showError('statistika-dogodkov', 'Napaka pri nalaganju statistike uporabnika. Poskusite znova.');
    }
  }
  
  function updateStatisticsUI(statistics) {
    // Update attendance statistics
    document.querySelector('.col-md-4:nth-child(1) h3').textContent = statistics.attended;
    
    // Update comments statistics
    document.querySelector('.col-md-4:nth-child(2) h3').textContent = statistics.comments;
    
    // Update ratings statistics
    document.querySelector('.col-md-4:nth-child(3) h3').textContent = statistics.ratings;
    
    // Clear existing category progress bars
    const leftCategoryContainer = document.querySelector('.col-md-6:nth-child(1)');
    const rightCategoryContainer = document.querySelector('.col-md-6:nth-child(2)');
    
    leftCategoryContainer.innerHTML = '';
    rightCategoryContainer.innerHTML = '';
    
    // Add category progress bars
    statistics.categories.forEach((category, index) => {
      const categoryHTML = createCategoryProgressBar(category);
      
      // Add categories alternating between left and right columns
      if (index % 2 === 0) {
        leftCategoryContainer.innerHTML += categoryHTML;
      } else {
        rightCategoryContainer.innerHTML += categoryHTML;
      }
    });
      // Recent activity section removed
  }
  
  function createCategoryProgressBar(category) {
    // Define a color map for categories
    const categoryColors = {
      'Koncert': 'bg-danger',
      'Delavnica': 'bg-info',
      'Sport': 'bg-success',
      'Izobrazevanje': 'bg-warning',
      'Sejem': 'bg-purple'
    };
    
    const colorClass = categoryColors[category.name] || 'bg-primary';
    
    return `
      <div class="mb-3">
        <label class="form-label d-flex justify-content-between mb-1">
          <span>${category.name}</span>
          <span>${category.count} ${getEventWordForm(category.count)}</span>
        </label>
        <div class="progress" style="height: 10px">
          <div class="progress-bar ${colorClass}" role="progressbar" 
               style="width: ${category.percentage}%" 
               aria-valuenow="${category.percentage}" 
               aria-valuemin="0" 
               aria-valuemax="100"></div>
        </div>
      </div>
    `;
  }
  
  // funkcije da se ti pravilno prikazejo napisi, ker pac slovenscina
  function formatDaysAgo(days) {
    if (days === 0) return "danes";
    if (days === 1) return "včeraj";
    if (days > 1 && days < 5) return `${days}} dni nazaj`;
    if (days === -1) return `jutri`;
    if (days < -1) return `čez ${Math.abs(days)} dni`;
    return `${days} dni nazaj`;
  }
  
  function getEventWordForm(count) {
    if (count === 1) return "dogodek";
    if (count === 2) return "dogodka";
    if (count === 3 || count === 4) return "dogodki";
    return "dogodkov";
  }

    async function loadFavoriteEvents() {
        const token = localStorage.getItem('userToken');
        if (!token) { // If no token, it might be a public profile, so don't try to load personal favorites
            // Check if we are on a public profile page (profileUserId is set and isOwner is false)
            const urlParams = new URLSearchParams(window.location.search);
            const profileUserId = urlParams.get('userId');
            if (profileUserId && !isOwner) { // isOwner should be globally available or passed
                 // Handled by loadPublicFavoriteEvents
                return;
            }
            console.warn("Token ni najden v localStorage in nismo na javnem profilu za nalaganje priljubljenih dogodkov.");
            return;
        }
        // This part remains for the logged-in user's own profile
        const favoriteEventsContainer = document.getElementById('favorite-events');
        if (!favoriteEventsContainer) {
            console.warn('Element #favorite-events not found for rendering events.');
            return;
        }

        try {
            favoriteEventsContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-primary spinner-border-sm" role="status">
                        <span class="visually-hidden">Nalaganje...</span>
                    </div>
                    <p class="mt-2 text-muted small">Nalaganje priljubljenih dogodkov...</p>
                </div>`;

            const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/favorites/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseText = await response.text(); // Get response as text first

            if (!response.ok) {
                console.error('Favorite events API request failed:', responseText);
                throw new Error('Napaka pri pridobivanju priljubljenih dogodkov');
            }

            const favoriteEvents = JSON.parse(responseText); // Parse text to JSON
            // console.log('Parsed favorite events:', favoriteEvents);

            // Call the helper function from the outer scope
            renderFavoriteEvents(favoriteEvents);

        } catch (error) {
            console.error('Napaka pri nalaganju priljubljenih dogodkov:', error);
            const favoriteEventsContainer = document.getElementById('favorite-events');
            if (favoriteEventsContainer) { // Check if container exists before trying to update it
                favoriteEventsContainer.innerHTML = '<p class="text-danger text-center">Napaka pri nalaganju priljubljenih dogodkov.</p>';
            }
        }
    }

    async function loadFavoriteOrganizers() {
        const token = localStorage.getItem('userToken');
        if (!token) { // If no token, it might be a public profile
            const urlParams = new URLSearchParams(window.location.search);
            const profileUserId = urlParams.get('userId');
             if (profileUserId && !isOwner) { // isOwner should be globally available or passed
                // Handled by loadPublicFavoriteOrganizers
                return;
            }
            console.warn("Token ni najden v localStorage in nismo na javnem profilu za nalaganje priljubljenih organizatorjev.");
            return;
        }
        // This part remains for the logged-in user's own profile
        const favoriteOrganizersContainer = document.getElementById('favorite-organizers');
        if (!favoriteOrganizersContainer) {
            console.warn('Element #favorite-organizers not found for rendering organizers.');
            return;
        }

        try {
            favoriteOrganizersContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-warning spinner-border-sm" role="status">
                        <span class="visually-hidden">Nalaganje...</span>
                    </div>
                    <p class="mt-2 text-muted small">Nalaganje priljubljenih organizatorjev...</p>
                </div>`;

            const response = await fetch(`${CONFIG.API_BASE_URL}/users/favorites/organizers`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseText = await response.text(); // Get response as text first

            if (!response.ok) {
                console.error('Favorite organizers API request failed:', responseText);
                throw new Error('Napaka pri pridobivanju priljubljenih organizatorjev');
            }

            const favoriteOrganizers = JSON.parse(responseText); // Parse text to JSON
            // console.log('Parsed favorite organizers:', favoriteOrganizers);
            
            // Call the helper function from the outer scope
            renderFavoriteOrganizers(favoriteOrganizers);

        } catch (error) {
            console.error('Napaka pri nalaganju priljubljenih organizatorjev:', error);
            const favoriteOrganizersContainer = document.getElementById('favorite-organizers');
             if (favoriteOrganizersContainer) { // Check if container exists
                favoriteOrganizersContainer.innerHTML = '<p class="text-danger text-center">Napaka pri nalaganju priljubljenih organizatorjev.</p>';
            }
        }
    }

    // New function to load public favorite events
    async function loadPublicFavoriteEvents(userId) {
        const favoriteEventsContainer = document.getElementById('favorite-events');
        if (!favoriteEventsContainer) {
            console.warn('Element #favorite-events not found for rendering public favorite events.');
            return;
        }
        try {
            favoriteEventsContainer.innerHTML = `<div class="text-center py-3"><div class="spinner-border text-primary spinner-border-sm" role="status"></div><p class="mt-2 text-muted small">Nalaganje priljubljenih dogodkov...</p></div>`;
            const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/public/favorites/events/${userId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Nepričakovana napaka pri branju odgovora strežnika' }));
                console.error('Public favorite events API request failed with status:', response.status, errorData);
                throw new Error(errorData.error || `Napaka pri pridobivanju javnih priljubljenih dogodkov: ${response.statusText}`);
            }
            const favoriteEvents = await response.json();
            renderFavoriteEvents(favoriteEvents); // Reuse existing render function
        } catch (error) {
            console.error('Napaka pri nalaganju javnih priljubljenih dogodkov:', error);
            if (favoriteEventsContainer) {
                favoriteEventsContainer.innerHTML = `<p class="text-danger text-center">Napaka pri nalaganju priljubljenih dogodkov uporabnika.</p>`;
            }
        }
    }

    // New function to load public favorite organizers
    async function loadPublicFavoriteOrganizers(userId) {
        const favoriteOrganizersContainer = document.getElementById('favorite-organizers');
        if (!favoriteOrganizersContainer) {
            console.warn('Element #favorite-organizers not found for rendering public favorite organizers.');
            return;
        }
        try {
            favoriteOrganizersContainer.innerHTML = `<div class="text-center py-3"><div class="spinner-border text-warning spinner-border-sm" role="status"></div><p class="mt-2 text-muted small">Nalaganje priljubljenih organizatorjev...</p></div>`;
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}/public/favorites/organizers`);
             if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Nepričakovana napaka pri branju odgovora strežnika' }));
                console.error('Public favorite organizers API request failed with status:', response.status, errorData);
                throw new Error(errorData.error || `Napaka pri pridobivanju javnih priljubljenih organizatorjev: ${response.statusText}`);
            }
            const favoriteOrganizers = await response.json();
            renderFavoriteOrganizers(favoriteOrganizers); // Reuse existing render function
        } catch (error) {
            console.error('Napaka pri nalaganju javnih priljubljenih organizatorjev:', error);
            if (favoriteOrganizersContainer) {
                favoriteOrganizersContainer.innerHTML = `<p class="text-danger text-center">Napaka pri nalaganju priljubljenih organizatorjev uporabnika.</p>`;
            }
        }
    }

    // Helper function to render favorite events - MOVED TO OUTER SCOPE
    function renderFavoriteEvents(events, showAll = false) {
        const favoriteEventsContainer = document.getElementById('favorite-events');
        if (!favoriteEventsContainer) {
            console.warn('Element #favorite-events not found for rendering events.');
            return;
        }
        let itemsToRender = showAll ? events : events.slice(0, 4);
        let eventsHtml = '';
        if (!events || events.length === 0) {
            favoriteEventsContainer.innerHTML = '<p class="text-muted text-center">Nimate priljubljenih dogodkov.</p>';
            return;
        }
        for (const event of itemsToRender) {
            const eventImage = event.slika ? event.slika : 'images/event-placeholder.png';
            eventsHtml += `
                <a href="podrobnosti_dogodka.html?id=${event.idDogodek}" class="list-group-item list-group-item-action d-flex align-items-center">
                    <img src="${eventImage}" alt="${encodeInput(event.naziv || 'Dogodek')}" class="me-3" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${encodeInput(event.naziv || 'Neznan dogodek')}</h6>
                        <small class="text-muted">${formatDate(event.cas)}</small>
                    </div>
                </a>`;
        }

        if (!showAll && events.length > 4) {
            eventsHtml += `<div class="text-center mt-2"><button class="btn btn-sm btn-outline-primary" id="show-all-favorite-events-btn">Prikaži vse najljubše dogodke (${events.length})</button></div>`;
        }
        favoriteEventsContainer.innerHTML = eventsHtml;

        if (!showAll && events.length > 4) {
            const showAllBtn = document.getElementById('show-all-favorite-events-btn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => renderFavoriteEvents(events, true), { once: true });
            }
        }
    }

    // Helper function to render favorite organizers - MOVED TO OUTER SCOPE
    function renderFavoriteOrganizers(organizers, showAll = false) {
        const favoriteOrganizersContainer = document.getElementById('favorite-organizers');
        if (!favoriteOrganizersContainer) {
            console.warn('Element #favorite-organizers not found for rendering organizers.');
            return;
        }
        let itemsToRender = showAll ? organizers : organizers.slice(0, 4);
        let organizersHtml = '';
         if (!organizers || organizers.length === 0) {
            favoriteOrganizersContainer.innerHTML = '<p class="text-muted text-center">Nimate priljubljenih organizatorjev.</p>';
            return;
        }
        for (const organizer of itemsToRender) {
            const obcinaHtml = organizer.obcina ? `<small class="text-muted">${encodeInput(organizer.obcina)}</small>` : '';
            const fullName = `${organizer.ime || ''} ${organizer.priimek || ''}`.trim();
            const displayName = fullName || organizer.username || 'Neznan Organizator';
            const organizerImage = organizer.slika ? organizer.slika : 'images/profile-placeholder.png';
            const userTypeIcon = getUserTypeIcon(organizer.tip_uporabnika);
            const badgeClass = getBadgeClass(organizer.tip_uporabnika);

            organizersHtml += `
                <a href="profil.html?userId=${organizer.idUporabnik}" class="list-group-item list-group-item-action d-flex align-items-center">
                    <img src="${organizerImage}" alt="${encodeInput(displayName)}" class="me-3" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${encodeInput(displayName)}</h6>
                        ${obcinaHtml}
                    </div>
                    <span class="badge ${badgeClass} rounded-pill">${userTypeIcon}</span>
                </a>`;
        }

        if (!showAll && organizers.length > 4) {
            organizersHtml += `<div class="text-center mt-2"><button class="btn btn-sm btn-outline-primary" id="show-all-favorite-organizers-btn">Prikaži vse najljubše organizatorje (${organizers.length})</button></div>`;
        }
        favoriteOrganizersContainer.innerHTML = organizersHtml;

        if (!showAll && organizers.length > 4) {
            const showAllBtn = document.getElementById('show-all-favorite-organizers-btn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => renderFavoriteOrganizers(organizers, true), { once: true });
            }
        }
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
            <p class="mt-2 text-muted">Shranjujem profil, prosimo počakajte...</p>
        `;
        
        // Insert at the beginning of the form
        form.firstElementChild.before(loadingDiv);
    }

    // Function to remove loading message
    function removeLoadingMessage() {
        // Remove any existing loading messages
        const existingLoadingMessages = document.querySelectorAll('.loading-message');
        existingLoadingMessages.forEach(msg => msg.remove());
    }
});