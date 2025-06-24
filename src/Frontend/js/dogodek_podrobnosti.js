// Datoteka za dinamičen prikaz podrobnosti dogodka

// XSS Protection - Fallback for encodeInput function
if (typeof encodeInput !== 'function') {
    console.error('encodeInput is not defined! Falling back to sanitization function.');
    window.encodeInput = function(input) { 
        if (input == null) return '';
        const encoded = document.createElement('div');
        encoded.innerText = String(input);
        return encoded.innerHTML;
    };
}

// Additional sanitization function following the pattern from upravljanje files
function sanitizeUserInput(input, allowedChars = '[^\\p{L}0-9 ,.!?-]') {
    if (input == null) return '';
    const regex = new RegExp(allowedChars, 'gu');
    return String(input).replace(regex, '');
}

// Error message sanitization to prevent XSS
function sanitizeErrorMessage(errorMessage) {
    if (errorMessage == null) return 'Prišlo je do napake.';
    // Allow only basic characters for error messages, preserve šumniki
    return sanitizeUserInput(errorMessage, '[^\\p{L}0-9 ,.!?:-]');
}

// Globalna funkcija za osvežitev ocen dogodka
function refreshEventRatings() {
    const urlParams = new URLSearchParams(window.location.search);
    const dogodekId = urlParams.get('id');
    
    // Preveri, če se je dogodek že zgodil
    if (!hasEventHappened()) {
        showFutureEventMessage('ratings');
        return;
    }
    
    if (!dogodekId) {
        console.error('ID dogodka ni najden za osvežitev ocen');
        return;
    }
    
    console.log('Osveževanje ocen za dogodek:', dogodekId);
    
    // Add a small loading indicator during refresh
    const ratingsContainer = document.querySelector('.event-rating');
    if (ratingsContainer) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'text-center mb-3 ratings-refresh-indicator';
        loadingIndicator.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Nalaganje...</span></div> <small class="text-muted ms-2">Osveževanje ocen...</small>';
        
        // Remove any existing indicators
        const existingIndicator = ratingsContainer.querySelector('.ratings-refresh-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Insert at the beginning of the container
        ratingsContainer.insertBefore(loadingIndicator, ratingsContainer.firstChild);
    }
    
    // Fetch event ratings with error handling
    fetchEventRatings(dogodekId)
        .catch(error => {
            console.error('Napaka v refreshEventRatings:', error);
            // Show error message if fetch fails
            if (ratingsContainer) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'alert alert-danger mt-3';
                errorMessage.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Napaka pri osveževanju ocen. Poskusite znova.';
                
                // Remove loading indicator
                const loadingIndicator = ratingsContainer.querySelector('.ratings-refresh-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
                ratingsContainer.insertBefore(errorMessage, ratingsContainer.firstChild);
                
                // Remove error message after 5 seconds
                setTimeout(() => {
                    if (errorMessage.parentNode === ratingsContainer) {
                        ratingsContainer.removeChild(errorMessage);
                    }
                }, 5000);
            }
        });
}

// Izpostavi funkcijo refreshEventRatings v globalnem obsegu
window.refreshEventRatings = refreshEventRatings;

/**
 * Prikaže ali skrije meni za urejanje komentarja
 * @param {Event} event - Event objekt
 * @param {number} commentId - ID komentarja
 */
function toggleCommentMenu(event, commentId) {
    event.stopPropagation();
    
    // Zapri vse odprte menije
    document.querySelectorAll('.comment-menu.show').forEach(menu => {
        if (menu.id !== `comment-menu-${commentId}`) {
            menu.classList.remove('show');
        }
    });
    
    const menu = document.getElementById(`comment-menu-${commentId}`);
    menu.classList.toggle('show');
}

/**
 * Pripravi obrazec za urejanje komentarja
 * @param {Event} event - Event objekt
 * @param {number} commentId - ID komentarja
 * @param {string} currentText - Trenutno besedilo komentarja
 */
function editComment(event, commentId, currentText) {
    event.stopPropagation();
    
    // Zapri meni
    const menu = document.getElementById(`comment-menu-${commentId}`);
    menu.classList.remove('show');
    
    // Najdi element komentarja
    const commentCard = document.getElementById(`comment-${commentId}`);
    const contentDiv = commentCard.querySelector('.comment-content');
    const originalContent = contentDiv.innerHTML;
    
    // Shranjmo originalno vsebino za primer preklica
    commentCard.dataset.originalContent = originalContent;
    
    // Ustvari obrazec za urejanje
    const decodedText = decodeURIComponent(currentText);
    contentDiv.innerHTML = `
        <div class="edit-comment-form">
            <textarea class="form-control mb-2">${decodedText}</textarea>
            <div>
                <button class="btn btn-primary btn-sm me-2" onclick="saveCommentEdit(${commentId})">Shrani</button>
                <button class="btn btn-outline-secondary btn-sm" onclick="cancelCommentEdit(${commentId})">Prekliči</button>
            </div>
        </div>
    `;
}

/**
 * Shrani urejeni komentar
 * @param {number} commentId - ID komentarja
 */
async function saveCommentEdit(commentId) {
    // Pridobi novi tekst komentarja
    const commentCard = document.getElementById(`comment-${commentId}`);
    const textarea = commentCard.querySelector('textarea');
    const newText = textarea.value.trim();
    
    if (!newText) {
        alert('Komentar ne more biti prazen.');
        return;
    }
    
    // Prikaži animacijo nalaganja
    const buttonsContainer = commentCard.querySelector('.edit-comment-form div');
    const originalButtonsHTML = buttonsContainer.innerHTML;
    buttonsContainer.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> <span>Shranjevanje...</span></div>';
    
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('Niste prijavljeni.');
        }
          // Pošlji zahtevo za posodobitev komentarja
        const response = await fetch(`${CONFIG.API_BASE_URL}/komentarji/user/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ komentar: newText })
        });
        
        if (!response.ok) {
            // Previdno obravnavamo odgovor, ki morda ni JSON
            let errorMessage = 'Napaka pri posodabljanju komentarja.';
            try {
                const data = await response.json();
                if (data && data.error) {
                    errorMessage = data.error;
                }
            } catch (jsonError) {
                console.error('Odgovor ni veljaven JSON:', jsonError);
                errorMessage = `Napaka na strežniku (status ${response.status})`;
            }
            throw new Error(errorMessage);
        }
        
        // Osveži prikaz komentarjev
        const urlParams = new URLSearchParams(window.location.search);
        const dogodekId = urlParams.get('id');
        fetchEventComments(dogodekId);
          } catch (error) {
        console.error('Napaka pri posodabljanju komentarja:', error);
        
        // Vrni gumbe na prvotno stanje
        buttonsContainer.innerHTML = originalButtonsHTML;
          const commentCard = document.getElementById(`comment-${commentId}`);
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger mt-2';
        errorAlert.innerHTML = `<i class="bi bi-x-circle"></i> ${sanitizeErrorMessage(error.message || 'Napaka pri posodabljanju komentarja.')}`;
        
        // Dodaj alert v edit form
        const editForm = commentCard.querySelector('.edit-comment-form');
        if (editForm) {
            // Odstrani morebitno obstoječe sporočilo o napaki
            const existingAlert = editForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            editForm.appendChild(errorAlert);
        }
    }
}

/**
 * Prekliče urejanje komentarja
 * @param {number} commentId - ID komentarja
 */
function cancelCommentEdit(commentId) {
    const commentCard = document.getElementById(`comment-${commentId}`);
    const contentDiv = commentCard.querySelector('.comment-content');
    
    // Vrni originalno vsebino
    contentDiv.innerHTML = commentCard.dataset.originalContent;
    delete commentCard.dataset.originalContent;
}

/**
 * Izbriše komentar
 * @param {Event} event - Event objekt
 * @param {number} commentId - ID komentarja
 */
async function deleteComment(event, commentId) {
    event.stopPropagation();
    
    // Zapri meni
    const menu = document.getElementById(`comment-menu-${commentId}`);
    menu.classList.remove('show');
    
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('Niste prijavljeni.');
        }
        
        // Dekodiranje JWT tokena za pridobitev vloge uporabnika
        let userRole = null;
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                userRole = payload.tip_uporabnika;
            }
        } catch (e) {
            console.error('Napaka pri dekodiranju tokena:', e);
        }
        
        let endpoint;
        
        // Če je uporabnik administrator ali organizator, uporabi drug endpoint
        if (userRole === 'Administrator' || userRole === 'Organizator') {
            endpoint = `${CONFIG.API_BASE_URL}/komentarji/${commentId}`;
        } else {
            // Za navadne uporabnike
            endpoint = `${CONFIG.API_BASE_URL}/komentarji/user/${commentId}`;
        }
          // Pošlji zahtevo za brisanje komentarja
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Previdno obravnavamo odgovor, ki morda ni JSON
            let errorMessage = 'Napaka pri brisanju komentarja.';            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data && data.error) {
                        errorMessage = data.error;
                    }
                } else {
                    console.error('Strežnik je vrnil odgovor, ki ni JSON');
                    errorMessage = `Napaka na strežniku (status ${response.status})`;
                }
            } catch (jsonError) {
                console.error('Odgovor ni veljaven JSON:', jsonError);
                errorMessage = `Napaka na strežniku (status ${response.status})`;
            }
            throw new Error(errorMessage);
        }
        
        // Osveži prikaz komentarjev
        const urlParams = new URLSearchParams(window.location.search);
        const dogodekId = urlParams.get('id');
        fetchEventComments(dogodekId);
          } catch (error) {
        console.error('Napaka pri brisanju komentarja:', error);
        
        const commentCard = document.getElementById(`comment-${commentId}`);        if (commentCard) {
            // Create the error alert
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-2';
            errorAlert.innerHTML = `<i class="bi bi-x-circle"></i> ${sanitizeErrorMessage(error.message || 'Napaka pri brisanju komentarja.')}`;
            
            // Add the error alert above the comment
            commentCard.parentNode.insertBefore(errorAlert, commentCard);
            
            // Remove the alert after 5 seconds
            setTimeout(() => {
                if (errorAlert.parentNode) {
                    errorAlert.parentNode.removeChild(errorAlert);
                }
            }, 3000);
        }
    }
}

// Dodaj poslušalec dogodkov za zapiranje menujev ob kliku zunaj
document.addEventListener('click', function(event) {
    if (!event.target.closest('.comment-menu') && !event.target.closest('.comment-menu-toggle')) {
        document.querySelectorAll('.comment-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Izpostavi funkcije v globalnem obsegu
window.toggleCommentMenu = toggleCommentMenu;
window.editComment = editComment;
window.saveCommentEdit = saveCommentEdit;
window.cancelCommentEdit = cancelCommentEdit;
window.deleteComment = deleteComment;

/**
 * Preveri, če je uporabnik bannan
 * @returns {Promise<boolean>} Ali je uporabnik bannan
 */
async function isUserBanned() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        return false; // Uporabnik ni prijavljen, torej ni bannan
    }

    try {
        // Najprej preveri, če imamo podatke v localStorage
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            
            // Če imamo podatke o banu in so bili posodobljeni v zadnjih 10 minutah, uporabi te podatke
            if (userInfo.hasOwnProperty('is_banned') && userInfo.lastUpdated) {
                const lastUpdated = new Date(userInfo.lastUpdated);
                const now = new Date();
                const differenceInMinutes = (now - lastUpdated) / (1000 * 60);
                
                // Če so podatki dovolj sveži (manj kot 10 minut), uporabimo jih
                if (differenceInMinutes < 10) {
                    console.log('Uporaba podatkov o banu iz localStorage:', userInfo.is_banned);
                    return userInfo.is_banned === true;
                }
            }
        }
        
        // Če nimamo podatkov v localStorage ali so prestari, naredimo API klic
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Napaka pri preverjanju statusa bana:', response.status);
            return false;
        }

        const userData = await response.json();
        
        // Posodobi podatke v localStorage
        if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            userInfo.is_banned = userData.is_banned === true;
            userInfo.lastUpdated = new Date().toISOString();
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
        }
        
        return userData.is_banned === true;
    } catch (error) {
        console.error('Napaka pri preverjanju statusa bana:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Pridobimo ID dogodka iz URL-ja (npr. ?id=3)
    const urlParams = new URLSearchParams(window.location.search);
    const dogodekId = urlParams.get('id');

    if (!dogodekId) {
        // Če dogodek ID ni podan, prikaži sporočilo o napaki
        showError('Na voljo ni podatkov o dogodku.');
        return;
    }    // Pridobi podatke o dogodku
    fetchEventDetails(dogodekId);
    
    // // Najprej pridobi ocene za dogodek, nato komentarje (da lahko uporabimo ocene v komentarjih)
    // fetchEventRatings(dogodekId)
    //     .then(() => {
    //         // Po pridobitvi ocen naloži še komentarje
    //         fetchEventComments(dogodekId);
    //     })
    //     .catch(err => {
    //         // V primeru napake pri pridobivanju ocen vseeno poskusi naložiti komentarje
    //         console.error('Napaka pri nalaganju ocen:', err);
    //         fetchEventComments(dogodekId);
    //     });

    // // Nastavi submit handler za obrazec za dodajanje komentarja
    // setupCommentForm(dogodekId);
    
    // // Inicializiraj Bootstrap tooltips
    // initTooltips();
    
    // // Preveri, če je dogodek med priljubljenimi in ustrezno posodobi ikono
    // checkFavoriteStatus();      // Poslušaj za dogodke spremembe ocene
    // document.addEventListener('ratingChange', (e) => {
    //     console.log('Zaznan dogodek spremembe ocene:', e.detail);
    //     refreshEventRatings();
    // });        // Dodaj poslušalca dogodkov za brisanje ocene
    // document.addEventListener('ratingDeleted', (e) => {
    //     console.log('Zaznan dogodek brisanja ocene:', e.detail);
    //     refreshEventRatings();
    // });
    
    // // Zagotovi, da dogodki spremembe ocene pravilno osvežijo ocene
    // document.addEventListener('ratingUpdated', (e) => {
    //     console.log('Zaznan dogodek posodobitve ocene:', e.detail);
    //     refreshEventRatings();
    // });
    
    // // Add CSS for better feedback during rating interaction
    // addRatingStyles();
});

/**
 * Dodaj prilagojene CSS sloge za ocenjevalni uporabniški vmesnik
 */
function addRatingStyles() {
    // Check if these styles already exist
    if (document.getElementById('rating-custom-styles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'rating-custom-styles';
    styleEl.textContent = `
        .rating-star {
            cursor: pointer;
            transition: transform 0.2s, color 0.2s;
        }
        .rating-star:hover {
            transform: scale(1.2);
        }
        .changing-rating {
            animation: pulse 1s infinite alternate;
            color: #ffc107 !important;
        }
        @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.2); }
        }      .rating-message {
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    
    document.head.appendChild(styleEl);
}

/**
 * Prikaže sporočilo o napaki na strani
 * @param {string} message - Sporočilo napake
 */
function showError(message) {
    const contentWrapper = document.querySelector('.content-wrapper');
    contentWrapper.innerHTML = `
        <div class="alert alert-danger my-5 text-center">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${encodeInput(message)}
            <div class="mt-3">
                <a href="index.html" class="btn btn-primary">Nazaj na domačo stran</a>
            </div>
        </div>
    `;
}

/**
 * Pridobi podatke o dogodku iz API-ja
 * @param {string|number} dogodekId - ID dogodka
 */
async function fetchEventDetails(dogodekId) {
    try {
        const token = localStorage.getItem('userToken');

        // Pridobi podrobnosti dogodka
        const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/${dogodekId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP napaka! Status: ${response.status}`);
        }
        
        const dogodek = await response.json();
        
        if (!dogodek) {
            showError('Dogodek ne obstaja.');
            return;
        }

        // Pridobi vremensko napoved
        const weatherResponse = await fetch(`${CONFIG.API_BASE_URL}/dogodki/${dogodekId}/vreme`);
        const weatherData = await weatherResponse.json();

        // Dodaj vremensko sporočilo k podatkom
        dogodek.vreme = weatherData.message;
        
        // Izpišemo podatke za debugging
        console.log('Prejeti podatki dogodka:', dogodek);
        
        // Prikaži podatke o dogodku
        displayEventDetails(dogodek, dogodekId);
        
    } catch (error) {
        console.error('Napaka pri pridobivanju dogodka:', error);
        showError('Pri nalaganju podatkov o dogodku je prišlo do napake. Poskusite znova kasneje.');
    }
}

/**
 * Prikaži podrobnosti dogodka na spletni strani
 * @param {Object} dogodek - Podatki o dogodku
 */
function displayEventDetails(dogodek, dogodekId) {
    // Store the event in sessionStorage for later use
    sessionStorage.setItem('currentEvent', JSON.stringify(dogodek));
    
    // Posodobi naslov dokumenta
    document.title = `SkupajTukaj - ${dogodek.naziv}`;
    
    // Posodobi naslov dogodka
    document.querySelector('.event-title').textContent = dogodek.naziv;
    
    // Posodobi podatke o datumu in času
    const datum = formatDate(dogodek.cas);
    const cas = formatTime(dogodek.cas);
    
    const eventDateElement = document.querySelector('.event-date');
    eventDateElement.innerHTML = `<i class="bi bi-calendar-event info-icon"></i>${encodeInput(datum)} • ${encodeInput(cas)}`;
    eventDateElement.setAttribute('data-datetime', dogodek.cas);
    
    // Posodobi podatke o lokaciji
    const naslov = dogodek.naslov;
    if (naslov) {
        const lokacija = `${naslov.ulica} ${naslov.hisna_stevilka}, ${naslov.obcina}`;
        document.querySelector('.event-location').innerHTML = `<i class="bi bi-geo-alt info-icon"></i>${encodeInput(lokacija)}`;
        
        // Posodobi zemljevid
        updateMap(naslov);
    }    
    const organizator = dogodek.organizator;
    if (organizator) {
        const organizatorIme = `${organizator.ime} ${organizator.priimek}`;
        const organizatorElement = document.querySelector('.event-organizer');
        
          let organizatorHtml = `
            <i class="bi bi-people info-icon"></i>
            <span>${encodeInput(organizatorIme)}
                <i class="bi bi-heart favorite-icon ms-2" 
                    onclick="toggleFavoriteOrganizer(event, ${organizator.idUporabnik})"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    title="Dodaj med priljubljene"></i>
            </span>
        `;
        
        organizatorElement.innerHTML = organizatorHtml;
          
        if (organizator.email) {            
            const kontaktLabel = document.createElement('p');
            kontaktLabel.className = 'event-kontakt-label';
            kontaktLabel.style.marginTop = "20px"; 
            kontaktLabel.innerHTML = `<strong>Kontakt :</strong>`; 
            
            
            const emailElement = document.createElement('p');
            emailElement.className = 'event-organizer-email';            emailElement.innerHTML = `
                <i class="bi bi-envelope-fill info-icon"></i>
                <div class="email-wrapper">
                    <a href="mailto:${encodeInput(organizator.email)}" class="organizer-email-link">${encodeInput(organizator.email)}</a>
                </div>
            `;
            
            
            organizatorElement.parentNode.insertBefore(kontaktLabel, organizatorElement.nextSibling);
            
            
            kontaktLabel.parentNode.insertBefore(emailElement, kontaktLabel.nextSibling);
        }
    }
    
    // Pridobi ceno vstopnice iz dogodka - ta je že vključena v response
    const cenaTekst = getTicketPriceFromEvent(dogodek);
    document.querySelector('.pricing-info p').innerHTML = `Cena vstopnice: <strong>${encodeInput(cenaTekst)}</strong>`;
    // Posodobi gumb za dodajanje dogodka med priljubljene
    document.querySelector('.favorite-btn').setAttribute('onclick', `toggleFavorite(event, ${dogodek.idDogodek})`);
    
    // Posodobi gumb za prijavo na dogodek
    document.querySelector('.cta-button').href = `#prijava-dogodek-${dogodek.idDogodek}`;
    
    // Dodaj gumb za nakup vstopnic, če je na voljo eventim_url
    const ticketButtonContainer = document.querySelector('.event-info') || document.querySelector('.cta-button').parentNode;
    
    // Odstrani obstoječi gumb za nakup vstopnic, če obstaja
    const existingTicketButton = document.getElementById('nakup-v-stopnic-btn');
    if (existingTicketButton) {
        existingTicketButton.remove();
    }
    
    if (dogodek.eventim_url && dogodek.eventim_url.trim() !== '') {
        // Ustvari nov gumb za nakup vstopnic
        const ticketButton = document.createElement('a');
        ticketButton.id = 'nakup-v-stopnic-btn';
        ticketButton.href = dogodek.eventim_url;
        ticketButton.target = '_blank'; // Odpri v novem zavihku
        ticketButton.rel = 'noopener noreferrer'; // Varnostna praksa za zunanje povezave
        ticketButton.className = 'btn btn-success btn-lg mt-4 d-flex align-items-center';
        ticketButton.innerHTML = '<i class="bi bi-ticket-perforated me-2"></i> Nakup vstopnic';
        
        // Vstavi gumb poleg obstoječega gumba za prijavo
        ticketButtonContainer.appendChild(ticketButton);
    }
      // Posodobi opis dogodka
    document.querySelector('.event-description').innerHTML = `
        <h3 class="mb-4">O dogodku</h3>
        ${dogodek.opis.split('\n').map(paragraph => `<p>${encodeInput(paragraph)}</p>`).join('')}
    `;
      // Posodobi sliko dogodka (če obstaja) - uporabi jo kot ozadje cele strani
    const eventBgElement = document.querySelector('.event-bg');
    if (dogodek.slika) {
        const slika = dogodek.slika.startsWith('http') ? dogodek.slika : dogodek.slika;
        eventBgElement.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url('${slika}')`;
    }    // Prikaži vremensko opozorilo
    if (dogodek.vreme) {
        const weatherAlert = document.createElement('div');
        weatherAlert.className = 'alert alert-info mt-4';
        weatherAlert.innerHTML = `
            <i class="bi bi-cloud-sun me-2"></i>
            ${encodeInput(dogodek.vreme)}
        `;

        const eventHeader = document.querySelector('.event-header');
        eventHeader.parentNode.insertBefore(weatherAlert, eventHeader.nextSibling);
    }
    
    // Inicializiraj odštevanje do dogodka (trenutno odštevanje se bo samodejno posodobilo z novim datumom)
    initCountdown();
    
    // After all elements are created:

    // Najprej pridobi ocene za dogodek, nato komentarje (da lahko uporabimo ocene v komentarjih)
    fetchEventRatings(dogodekId)
        .then(() => {
            // Po pridobitvi ocen naloži še komentarje
            fetchEventComments(dogodekId);
        })
        .catch(err => {
            // V primeru napake pri pridobivanju ocen vseeno poskusi naložiti komentarje
            console.error('Napaka pri nalaganju ocen:', err);
            fetchEventComments(dogodekId);
        });

    // Nastavi submit handler za obrazec za dodajanje komentarja
    setupCommentForm(dogodekId);
    
    // Inicializiraj Bootstrap tooltips
    initTooltips();
    
    // Preveri, če je dogodek med priljubljenimi in ustrezno posodobi ikono
    checkFavoriteStatus();      // Poslušaj za dogodce spremembe ocene
    document.addEventListener('ratingChange', (e) => {
        console.log('Zaznan dogodek spremembe ocene:', e.detail);
        refreshEventRatings();
    });        // Dodaj poslušalca dogodkov za brisanje ocene
    document.addEventListener('ratingDeleted', (e) => {
        console.log('Zaznan dogodek brisanja ocene:', e.detail);
        refreshEventRatings();
    });
    
    // Zagotovi, da dogodki spremembe ocene pravilno osvežijo ocene
    document.addEventListener('ratingUpdated', (e) => {
        console.log('Zaznan dogodek posodobitve ocene:', e.detail);
        refreshEventRatings();
    });
    
    // Add CSS for better feedback during rating interaction
    addRatingStyles();
}

/**
 * Posodobi zemljevid z izbrano lokacijo
 * @param {Object} naslov - Podatki o naslovu
 */
function updateMap(naslov) {
    const mapContainer = document.querySelector('.event-map');
    if (!mapContainer) return;
    
    // Ustvari poizvedbo za Google Maps zemljevid
    const query = encodeURIComponent(`${naslov.ulica} ${naslov.hisna_stevilka}, ${naslov.postna_stevilka} ${naslov.obcina}`);
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=AIzaSyDOToMjSYpFKEHt5OekMsyk05iOFCYY-DQ&q=${query}`;
    
    mapContainer.src = mapSrc;
}

/**
 * Inicializira odštevanje do dogodka
 */
function initCountdown() {
    // Odstevanje.js bo samodejno uporabil data-datetime atribut iz .event-date elementa
    if (typeof updateCountdown === 'function') {
        updateCountdown();
    }
}

/**
 * Formatira datum
 * @param {string} dateTimeString - Datum in čas v obliki ISO niza
 * @returns {string} - Formatiran datum
 */
function formatDate(dateTimeString) {
    const options = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric'
    };
    
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('sl-SI', options);
}

/**
 * Formatira samo čas
 * @param {string} dateTimeString - Datum in čas v obliki ISO niza
 * @returns {string} - Formatiran čas
 */
function formatTime(dateTimeString) {
    const options = { 
        hour: '2-digit', 
        minute: '2-digit'
    };
    
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('sl-SI', options);
}

/**
 * Pridobi ceno iz podatkov dogodka
 * @param {Object} dogodek - Objekt dogodka, ki vsebuje cenik
 * @returns {string} - Formatirana cena z valuto
 */
function getTicketPriceFromEvent(dogodek) {
    try {
        console.log('Pridobivamo ceno za dogodek:', dogodek);
        
        // Preveri različne strukture podatkov
        let cenikData;
        
        // Bookshelf vrne dogodek bodisi kot Model (attributes) ali kot JSON
        if (dogodek.attributes && dogodek.attributes.cenik) {
            // Bookshelf model
            cenikData = dogodek.attributes.cenik;
            console.log('Cenik iz attributes:', cenikData);
        } else if (dogodek.cenik) {
            // JSON objekt
            cenikData = dogodek.cenik;
            console.log('Cenik iz dogodek.cenik:', cenikData);
        } else {
            console.log('Dogodek nima cenika');
            return "Ni na voljo";
        }
        
        // Različne strukture podatkov, odvisno od Bookshelf
        let data;
        if (Array.isArray(cenikData)) {
            data = cenikData;
        } else if (cenikData.models) {
            data = cenikData.models;
        } else if (cenikData.toJSON) {
            data = cenikData.toJSON();
        } else {
            data = []; // Prazno v primeru, če ne najdemo nobene strukture
        }
        
        console.log('Obdelani podatki cenika:', data);
        
        if (data.length > 0) {
            // Vzamemo prvo ceno (najbolj relevantno, ker je že filtrirana po datumu)
            const price = data[0];
            console.log('Izbrana cena:', price);
            
            // Cena je lahko v različnih oblikah, odvisno od strukture
            const cenaValue = price.cena || (price.attributes ? price.attributes.cena : null);
            
            if (cenaValue !== null && cenaValue !== undefined) {
                return `${parseFloat(cenaValue).toFixed(2)} €`;
            }
        }
        
        console.log('Ni veljavnih cen za današnji datum');
        return "Ni na voljo";
    } catch (error) {
        console.error('Napaka pri pridobivanju cene iz dogodka:', error);
        return "Ni na voljo";
    }
}

/**
 * Pridobi komentarje za dogodek iz API-ja
 * @param {string|number} dogodekId - ID dogodka
 */
async function fetchEventComments(dogodekId) {
    // Preveri, če se je dogodek že zgodil
    if (!hasEventHappened()) {
        showFutureEventMessage('comments');
        return;
    }

    // Najprej preveri, ali je uporabnik bannan
    const banned = await isUserBanned();
      if (banned) {
        // Če je uporabnik bannan, prikaži ustrezno sporočilo namesto komentarjev
        document.querySelector('.comments-list').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle"></i> 
                Vaš račun je blokiran. Komentiranje dogodka ni mogoče.
            </div>
        `;
        
        // Onemogoči obrazec za komentiranje
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            const textarea = commentForm.querySelector('textarea');
            const submitBtn = commentForm.querySelector('button[type="submit"]');
            
            if (textarea) {
                textarea.disabled = true;
                textarea.placeholder = "Vaš račun je blokiran. Komentiranje dogodka ni mogoče.";
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
            }
        }
        
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/komentarji?id_dogodka=${dogodekId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP napaka pri pridobivanju komentarjev! Status: ${response.status}`);
        }
        
        const komentarji = await response.json();
        
        // Izpišemo podatke za debugging
        console.log('Prejeti komentarji:', komentarji);
        
        // Prikaži komentarje
        displayComments(komentarji);
        
    } catch (error) {
        console.error('Napaka pri pridobivanju komentarjev:', error);
        document.querySelector('.comments-list').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Pri nalaganju komentarjev je prišlo do napake.
            </div>
        `;
    }
}

/**
 * Pridobi ocene za dogodek iz API-ja
 * @param {string|number} dogodekId - ID dogodka
 */
async function fetchEventRatings(dogodekId) {
    try {
        // Preveri, če se je dogodek že zgodil
        if (!hasEventHappened()) {
            showFutureEventMessage('ratings');
            return [];
        }

        // Clear any refresh indicators now that we're actually fetching
        const ratingsContainer = document.querySelector('.event-rating');
        if (ratingsContainer) {
            const refreshIndicator = ratingsContainer.querySelector('.ratings-refresh-indicator');
            if (refreshIndicator) {
                refreshIndicator.remove();
            }
        }
        
        // Preveri, če je uporabnik blokiran
        const banned = await isUserBanned();
          if (banned) {
            // Prikaži sporočilo za blokirane uporabnike
            document.querySelector('.event-rating').innerHTML = `
                <h3 class="mb-3">Oceni dogodek</h3>
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> 
                    Vaš račun je blokiran. Komentiranje dogodka ni mogoče.
                </div>
            `;
            return [];
        }
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/ocene?id_dogodka=${dogodekId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP napaka pri pridobivanju ocen! Status: ${response.status}`);
        }
        
        const ocene = await response.json();
          // Izpišemo podatke za debugging
        console.log('Prejete ocene:', ocene);
        
        // Shrani vse ocene v globalni objekt za uporabo v komentarjih
        window.allEventRatings = ocene;
        
        // Prikaži ocene
        displayRatings(ocene);
        
        // If there was a refresh indicator, remove it
        if (ratingsContainer) {
            const refreshIndicator = ratingsContainer.querySelector('.ratings-refresh-indicator');
            if (refreshIndicator) {
                refreshIndicator.remove();
            }
        }
        
        return ocene;
    } catch (error) {
        console.error('Napaka pri pridobivanju ocen:', error);
        document.querySelector('.event-rating').innerHTML = `
            <h3 class="mb-3">Oceni dogodek</h3>
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Pri nalaganju ocen je prišlo do napake.
            </div>
            <button class="btn btn-sm btn-primary mt-3 retry-ratings-btn">
                <i class="bi bi-arrow-clockwise me-1"></i> Poskusi znova
            </button>
        `;
        
        // Add event listener to retry button
        const retryBtn = document.querySelector('.retry-ratings-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                console.log('Retrying ratings fetch...');
                fetchEventRatings(dogodekId);
            });
        }
        
        throw error; // Re-throw to allow promise chaining
    }
}

/**
 * Prikaži komentarje za dogodek
 * @param {Array} komentarji - Seznam komentarjev
 */
function displayComments(komentarji) {
    const commentsContainer = document.querySelector('.comments-list');
    const commentCountElement = document.querySelector('.comment-count');
    
    // Če ni komentarjev
    if (!komentarji || komentarji.length === 0) {
        commentsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 
                Trenutno ni komentarjev za ta dogodek. Bodite prvi, ki komentira!
            </div>
        `;
        commentCountElement.textContent = '(0)';
        return;
    }
    
    // Posodobi število komentarjev
    commentCountElement.textContent = `(${komentarji.length})`;
    
    // Pridobi ocene dogodka za preverbo uporabnikovih ocen
    const urlParams = new URLSearchParams(window.location.search);
    const dogodekId = urlParams.get('id');
    
    // Sortiraj komentarje po datumu (najnovejši najprej)
    komentarji.sort((a, b) => {
        const dateA = new Date(a.cas_dodajanja || a.created_at);
        const dateB = new Date(b.cas_dodajanja || b.created_at);
        return dateB - dateA;
    });
    
    let commentsHTML = '';
      // Preveri, če je uporabnik prijavljen in pridobi njegov ID
    const token = localStorage.getItem('userToken');
    let currentUserId = null;
    let userRole = null;
    
    if (token) {
        try {
            // Dekodiranje JWT tokena za pridobitev ID uporabnika in vloge
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                currentUserId = payload.idUporabnik || payload.id;
                userRole = payload.tip_uporabnika;
            }
        } catch (error) {
            console.error('Napaka pri dekodiranju tokena:', error);
        }
    }
    
    // Prikaži vsak komentar
    for (const komentar of komentarji) {
        // Get creation date from datum field (vem da datum ni najboljse poimenovanje ampak zaj je to late, to lahk later popravimo)
        const date = new Date(komentar.datum);
        const formattedDate = date.toLocaleDateString('sl-SI', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
          // Get user data - handle different API formats
        const user = komentar.uporabnik || komentar.user || {};
          // Safely get user name
        let userName = 'Anonimni uporabnik';
        if (user) {
            const name = user.ime || '';
            const surname = user.priimek || '';
            if (name || surname) {
                userName = `${name} ${surname}`.trim();
            }
        }        userName = encodeInput(userName); 
        let avatarUrl = 'images/profile-placeholder.png'; 
        if (user && user.is_banned) {
            avatarUrl = 'images/ban-img.gif';
        } else if (user && user.slika) {
            avatarUrl = encodeInput(user.slika);
        }
        
        // Extract the comment text from the appropriate field
        let commentText = komentar.text_uporabnika || komentar.text || '';

        commentText = encodeInput(commentText); // sanitize
        
        // Get user ID to check if they've rated the event
        const userId = komentar.TK_uporabnik || (user ? user.idUporabnik : null);
        const commentId = komentar.idKomentar;
        
        // Rating stars HTML if the user has a rating in the global ratings
        let ratingStarsHTML = '';
        let rating = 0;
        
        // Check if window.allEventRatings exists and contains this user's rating
        if (window.allEventRatings && userId) {
            const userRating = window.allEventRatings.find(ocena => 
                ocena.TK_uporabnik === userId || ocena.id_uporabnika === userId
            );
            
            if (userRating) {
                rating = userRating.ocena;
            }
        }
        
        if (rating > 0) {
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5;
            
            ratingStarsHTML = '<div class="comment-rating">';
            
            // Add full stars
            for (let i = 0; i < fullStars; i++) {
                ratingStarsHTML += '<i class="bi bi-star-fill"></i>';
            }
            
            // Add half star if needed
            if (halfStar) {
                ratingStarsHTML += '<i class="bi bi-star-half"></i>';
            }
            
            // Add empty stars to reach 5 stars total
            const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
            for (let i = 0; i < emptyStars; i++) {
                ratingStarsHTML += '<i class="bi bi-star"></i>';
            }
            
            ratingStarsHTML += '</div>';
        }
        
        // Preveri, če ima uporabnik pravice za urejanje in brisanje tega komentarja
        let showActionMenu = false;
        
        // Uporabnik lahko ureja ali briše svoj komentar
        if (currentUserId && userId === currentUserId) {
            showActionMenu = true;
        }
        
        // Admin ali organizator lahko briše vse komentarje
        if (currentUserId && (userRole === 'Administrator' || userRole === 'Organizator')) {
            showActionMenu = true;
        }
        
        // Dodaj meni za urejanje samo, če je uporabnik prijavljen in ima pravice
        let actionMenuHTML = '';
        if (showActionMenu) {
            actionMenuHTML = `
                <div class="comment-actions">
                    <button class="comment-menu-toggle" onclick="toggleCommentMenu(event, ${commentId})">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <div class="comment-menu" id="comment-menu-${commentId}">
                        ${userId === currentUserId ? `<a class="comment-menu-item" onclick="editComment(event, ${commentId}, '${encodeURIComponent(komentar.text_uporabnika || '')}')">
                            <i class="bi bi-pencil me-2"></i> Uredi
                        </a>` : ''}
                        <a class="comment-menu-item" onclick="deleteComment(event, ${commentId})">
                            <i class="bi bi-trash me-2"></i> Izbriši
                        </a>
                    </div>
                </div>
            `;        }
        
        const bannedStyles = user && user.is_banned ? 'style="border: 3px solid #dc3545;"' : '';
        const bannedTooltip = user && user.is_banned ? 'title="Ta uporabnik je blokiran"' : '';
        
        // Create comment HTML
        commentsHTML += `
            <div class="comment-card" id="comment-${commentId}">
                ${actionMenuHTML}
                <div class="comment-header d-flex align-items-center">
                    <div class="user-avatar me-3">
                        <a href="profil.html?userId=${userId}">
                            <img src="${avatarUrl}" alt="${userName}" class="rounded-circle" ${bannedStyles} ${bannedTooltip}>
                        </a>
                    </div>

                    <div class="user-info">
                        <h6 class="user-name mb-0">
                            <a href="profil.html?userId=${userId}" style="text-decoration: none;">
                                ${userName}
                            </a>
                        </h6>

                        <div class="comment-meta">
                            <span class="comment-date">${formattedDate}</span>
                            ${ratingStarsHTML}
                        </div>
                    </div>
                </div>
                <div class="comment-content mt-2">
                    <p>${commentText}</p>
                </div>
            </div>
        `;
    }
    
    // Add "load more comments" button only if there are many comments
    if (komentarji.length > 5) {
        commentsHTML += `
            <div class="text-center mt-4">
                <button class="btn btn-outline-primary load-more-comments">
                    Naloži več komentarjev <i class="bi bi-arrow-down"></i>
                </button>
            </div>
        `;
    }
    
    // Posodobi DOM
    commentsContainer.innerHTML = commentsHTML;
}

/**
 * Prikaži ocene za dogodek in izračunaj statistiko
 * @param {Array} ocene - Seznam ocen
 */
function displayRatings(ocene) {
    const ratingsContainer = document.querySelector('.event-rating');
      // Preveri, če je uporabnik prijavljen in če je že ocenil dogodek
    const token = localStorage.getItem('userToken');
    let userRating = null;
    // Če je uporabnik prijavljen, preveri če je že ocenil dogodek
    if (token) {
        try {
            // Dekodiranje JWT tokena za pridobitev ID uporabnika
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                const userId = payload.idUporabnik || payload.id;
                
                // Preveri, če obstaja ocena tega uporabnika
                const userRatingObj = ocene.find(ocena => 
                    (ocena.TK_uporabnik === userId || ocena.id_uporabnika === userId)
                );
                
                if (userRatingObj) {
                    // Save the complete user rating object for later use
                    userRating = userRatingObj;
                    
                    // Also store in the global window object for access by other scripts
                    window.currentUserRating = userRatingObj;
                    
                    console.log('User already rated this event:', userRatingObj);
                }
            }
        } catch (error) {
            console.error('Napaka pri preverjanju uporabnikove ocene:', error);
        }
    }
    
    // Če ni ocen
    if (!ocene || ocene.length === 0) {
        ratingsContainer.innerHTML = `
            <h3 class="mb-3">Oceni dogodek</h3>
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 
                Ta dogodek še nima ocen. Bodite prvi, ki ga oceni!
            </div>
            <div class="your-rating mt-4">
                <div class="star-rating">
                    <i class="bi bi-star rating-star" data-rating="1"></i>
                    <i class="bi bi-star rating-star" data-rating="2"></i>
                    <i class="bi bi-star rating-star" data-rating="3"></i>
                    <i class="bi bi-star rating-star" data-rating="4"></i>
                    <i class="bi bi-star rating-star" data-rating="5"></i>
                </div>
            </div>
        `;
        
        // Nastavi poslušalce dogodkov za ocenjevalne zvezdice
        setupRatingStars();
        return;
    }
    
    // Izračunaj povprečno oceno in statistiko
    const totalRatings = ocene.length;
    let sumRatings = 0;
    const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    for (const ocena of ocene) {
        const rating = Math.round(ocena.ocena); // Round to nearest integer
        sumRatings += ocena.ocena;
        
        // Increment count for this rating
        if (rating >= 1 && rating <= 5) {
            ratingCounts[rating]++;
        }
    }
    
    const avgRating = sumRatings / totalRatings;
    const avgRatingFormatted = avgRating.toFixed(1);
    
    // Generate the rating stars HTML
    const fullStars = Math.floor(avgRating);
    const halfStar = avgRating % 1 >= 0.5;
    
    let ratingStarsHTML = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        ratingStarsHTML += '<i class="bi bi-star-fill"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
        ratingStarsHTML += '<i class="bi bi-star-half"></i>';
    }
    
    // Add empty stars to reach 5 stars total
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        ratingStarsHTML += '<i class="bi bi-star"></i>';
    }
    
    // Create the ratings breakdown HTML
    let ratingsBreakdownHTML = '';
    for (let i = 5; i >= 1; i--) {
        const count = ratingCounts[i] || 0;
        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
        
        ratingsBreakdownHTML += `
            <div class="rating-row d-flex align-items-center mb-1">
                <span class="rating-label me-2">${i}</span>
                <div class="progress flex-grow-1">
                    <div class="progress-bar bg-primary" 
                         role="progressbar" 
                         style="width: ${percentage}%" 
                         aria-valuenow="${percentage}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                <span class="rating-count ms-2">${count}</span>
            </div>
        `;
    }
    
    // Update the DOM with the complete ratings section
    ratingsContainer.innerHTML = `
        <h3 class="mb-3">Oceni dogodek</h3>
        <div class="d-flex align-items-center mb-4">
            <div class="event-average-rating me-4">
                <div class="rating-value">${avgRatingFormatted}</div>
                <div class="rating-stars">
                    ${ratingStarsHTML}
                </div>
                <div class="rating-count">${totalRatings} ocen</div>
            </div>
            <div class="rating-breakdown flex-grow-1">
                ${ratingsBreakdownHTML}
            </div>
        </div>
        <div class="your-rating">
            <div class="star-rating">
                <i class="bi bi-star rating-star" data-rating="1"></i>
                <i class="bi bi-star rating-star" data-rating="2"></i>
                <i class="bi bi-star rating-star" data-rating="3"></i>
                <i class="bi bi-star rating-star" data-rating="4"></i>
                <i class="bi bi-star rating-star" data-rating="5"></i>
            </div>
            <div class="rating-actions mt-3 d-none">
                <div class="mb-2 small text-light">Že imate oceno. Želite jo spremeniti?</div>
                <button class="btn btn-sm btn-outline-primary me-2 change-rating-btn">
                    <i class="bi bi-pencil-fill me-1"></i> Spremeni oceno
                </button>
                <button class="btn btn-sm btn-outline-danger remove-rating-btn">
                    <i class="bi bi-trash me-1"></i> Odstrani oceno
                </button>
            </div>
        </div>
    `;    // Če je uporabnik že ocenil dogodek, nastavi zvezdice na njegovo oceno
    if (userRating) {
        const yourRatingContainer = ratingsContainer.querySelector('.your-rating');
        const ratingStars = yourRatingContainer.querySelectorAll('.rating-star');
        const ratingActionsDiv = yourRatingContainer.querySelector('.rating-actions');
          // Store the user's rating info globally for later use
        window.currentUserRating = {
            id: userRating.id || userRating.idOcena,
            ocena: userRating.ocena,
            dogodekId: new URLSearchParams(window.location.search).get('id')
        };
        
        // Add rating ID as data attribute to the container for easy access
        yourRatingContainer.dataset.ratingId = userRating.id;
        
        // Show the rating actions buttons
        if (ratingActionsDiv) {
            ratingActionsDiv.classList.remove('d-none');
        }
        
        ratingStars.forEach(star => {
            const starRating = parseInt(star.dataset.rating);
            if (starRating <= userRating.ocena) {
                star.classList.remove('bi-star');
                star.classList.add('bi-star-fill');
            } else {
                star.classList.remove('bi-star-fill');
                star.classList.add('bi-star');
            }
        });
    }
    
    // Nastavi poslušalce dogodkov za ocenjevalne zvezdice
    setupRatingStars();
}

// Izpostavi funkcijo displayRatings v globalnem obsegu
window.displayRatings = displayRatings;

/**
 * Funkcija setupRatingStars je zdaj prestavljena v ocene.js
 * Ker je klic še vedno potreben, tukaj pustimo samo klic na funkcijo v ocene.js
 */
function setupRatingStars() {
    // Klic funkcije iz ocene.js
    if (typeof window.setupRatingStars === 'function') {
        window.setupRatingStars();
    } else if (typeof setupRatingStarsFromOcene === 'function') {
        setupRatingStarsFromOcene();
    } else {
        console.error('setupRatingStars funkcija ni na voljo!');
    }
    
    // Also set up the rating action buttons
    setupRatingActionButtons();
}

/**
 * Nastavi poslušalce dogodkov za gumbe za urejanje ocen (spremeni in odstrani oceno)
 */
function setupRatingActionButtons() {
    const changeRatingBtn = document.querySelector('.change-rating-btn');
    const removeRatingBtn = document.querySelector('.remove-rating-btn');
      if (changeRatingBtn) {
        changeRatingBtn.addEventListener('click', () => {
            // Preveri, če imamo podatke o oceni uporabnika
            if (!window.currentUserRating) {
                if (typeof window.showRatingMessage === 'function') {
                    window.showRatingMessage('Napaka: Manjkajo podatki o vaši oceni.', 'warning');
                } else {
                    alert('Napaka: Manjkajo podatki o vaši oceni.');
                }
                return;
            }
            
            // Display a message to the user
            if (typeof window.showRatingMessage === 'function') {
                window.showRatingMessage('Izberite novo oceno z zvezdami zgoraj.', 'info', 8000);
            }
            
            // Trigger change rating mode in the UI
            const ratingStars = document.querySelectorAll('.rating-star');
            ratingStars.forEach(star => {
                star.classList.add('changing-rating');
                star.title = 'Kliknite za spremembo ocene';
            });
            
            // Flag for rating.js that we're in change mode
            window.isChangingRating = true;
        });
    }
    
    if (removeRatingBtn) {
        removeRatingBtn.addEventListener('click', async () => {
            // Check if we have the user's rating information
            if (!window.currentUserRating) {
                if (typeof window.showRatingMessage === 'function') {
                    window.showRatingMessage('Napaka: Manjkajo podatki o vaši oceni.', 'warning');
                } else {
                    alert('Napaka: Manjkajo podatki o vaši oceni.');
                }
                return;
            }
            
            // Confirm with the user
            if (confirm('Ali ste prepričani, da želite odstraniti svojo oceno?')) {
                // Get rating ID and event ID
                const ratingId = window.currentUserRating.id;
                const dogodekId = new URLSearchParams(window.location.search).get('id');
                
                // Use the manageEventRating helper function
                const success = await window.manageEventRating('delete', ratingId, null, dogodekId);
                
                if (success) {
                    // Reset UI to allow for new rating
                    const ratingActionsDiv = document.querySelector('.rating-actions');
                    if (ratingActionsDiv) {
                        ratingActionsDiv.classList.add('d-none');
                    }
                    
                    // Clear the current rating
                    window.currentUserRating = null;
                    
                    // Reset the stars for new rating
                    const ratingStars = document.querySelectorAll('.rating-star');
                    ratingStars.forEach(star => {
                        star.classList.remove('bi-star-fill');
                        star.classList.add('bi-star');
                    });
                }
            }
        });
    }
}

/**
 * Funkcija checkUserRating je prestavljena v ocene.js
 * Ta funkcija je bila prej uporabljena za preverjanje, ali je uporabnik že ocenil dogodek
 * Zdaj je vsa funkcionalnost ocenjevanja prestavljena v ocene.js 
 */

/**
 * Ustvari animacijo plovnih srčkov
 * @param {HTMLElement} sourceElement - Element, iz katerega izvira animacija
 * @param {number} count - Število srčkov za animacijo
 * @param {boolean} isSmall - Ali so srčki manjši
 * @param {boolean} filled - Ali so srčki napolnjeni (roza) ali prazni (outline)
 */
function createFloatingHearts(sourceElement, count = 3, isSmall = false, filled = false) {
  // Pridobi pozicijo izvornega elementa
  const rect = sourceElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
    // Ustvari srčke
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('i');
    // Če je filled (roza), uporabi heart-fill, drugače uporabi heart (outline)
    heart.classList.add('bi', filled ? 'bi-heart-fill' : 'bi-heart', 'floating-heart');
    heart.style.position = 'fixed';
    heart.style.color = '#ff3366';
    heart.style.fontSize = isSmall ? '12px' : '16px';
    
    let baseHorizontalOffset;
    if (count === 3) {
      // Za tri srčke uporabimo osnovno enakomerno razporeditev kot izhodišče
      if (i === 0) baseHorizontalOffset = -10; 
      else if (i === 1) baseHorizontalOffset = 0;
      else baseHorizontalOffset = 10;
    } else {
      baseHorizontalOffset = (i - (count - 1) / 2) * 15;
    }
    
    // Dodaj naključno variacijo na bazni odmik za bolj naravni izgled
    const randomVariation = (Math.random() - 0.5) * 12;
    const horizontalOffset = baseHorizontalOffset + randomVariation;
    
    // Različni vertikalni začetni položaji za manj linearni izgled
    const verticalOffset = (i % 2 === 0 ? -1 : 1) * Math.random() * 10;
    
    heart.style.left = `${centerX + horizontalOffset}px`;
    heart.style.top = `${centerY - verticalOffset}px`;
    heart.style.opacity = '0';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '1050';
    
    const randomScale = 0.8 + Math.random() * 0.4; // Naključna velikost med 80% in 120%
    heart.style.transform = `scale(${randomScale})`;
    
    const randomDuration = 0.8 + Math.random() * 0.4; // Časi med 0.8s in 1.2s
    
    // Uporabimo različne razrede animacij za različne poti
    const animationClass = `floatUp${i % 3 + 1}`;
    heart.style.animation = `${animationClass} ${randomDuration}s ease-out`;
    
    document.body.appendChild(heart);
    
    // Odstrani srček po animaciji
    setTimeout(() => {
      if (document.body.contains(heart)) {
        document.body.removeChild(heart);
      }
    }, randomDuration * 1000);
  }
}

/**
 * Funkcija za dodajanje/odstranjevanje organizatorja iz priljubljenih
 * @param {Event} event - Dogodek klika
 */
function toggleFavoriteOrganizer(event, id) {
  event.stopPropagation(); // Prepreči klik na starševski element
  const icon = event.currentTarget;
  
  // Uniči obstoječi tooltip pred spremembami
  const tooltip = bootstrap.Tooltip.getInstance(icon);
  if (tooltip) {
    tooltip.dispose();
  }
  // Preveri, če je uporabnik prijavljen
  const token = localStorage.getItem('userToken');
  if (!token) {
    showNotification('Za dodajanje med priljubljene se morate prijaviti.', 'warning');
    return;
  }

  // Določi ali gre za dodajanje ali odstranjevanje iz priljubljenih
  const isAdding = icon.classList.contains('bi-heart');
  
  // Prikažimo vizualni odziv takoj za boljšo uporabniško izkušnjo
  if (isAdding) {
    // Dodajanje organizatorja med priljubljene
    icon.classList.remove('bi-heart');
    icon.classList.add('bi-heart-fill', 'active', 'heart-pulse');
    
    // Sprostitev plovnih srčkov - niso napolnjeni (false) ko dodajamo med priljubljene
    createFloatingHearts(icon, 3, true, false);
    
    // Posodobi tooltip atribute, ampak brez vidnega teksta
    icon.setAttribute('title', 'Odstrani iz priljubljenih');
    icon.setAttribute('data-bs-original-title', 'Odstrani iz priljubljenih');
    
    // Odstrani animacijo po končanem predvajanju
    setTimeout(() => {
      icon.classList.remove('heart-pulse');
    }, 500);
  } else {
    // Odstranjevanje organizatorja iz priljubljenih
    // Sprostitev plovnih srčkov - roza so (filled=true) ko odstranjujemo iz priljubljenih
    createFloatingHearts(icon, 3, true, true);
    
    icon.classList.remove('bi-heart-fill', 'active');
    icon.classList.add('bi-heart');
    
    // Posodobi tooltip atribute
    icon.setAttribute('title', 'Dodaj med priljubljene');
    icon.setAttribute('data-bs-original-title', 'Dodaj med priljubljene');
  }
  
  // Ponovno inicializiraj tooltip po spremembi
  new bootstrap.Tooltip(icon, {
    trigger: 'hover',
    boundary: 'window',
    delay: {
      show: 300,
      hide: 100
    }
  });

  // Klic ustreznega API endpointa
  fetch(`${CONFIG.API_BASE_URL}/users/favorite_organizator/${id}`, {
    method: isAdding ? 'POST' : 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP napaka! Status: ${response.status}`);
    }
      console.log(`Organizator ${id} ${isAdding ? 'dodan med' : 'odstranjen iz'} priljubljene`);
    
    // Show success notification
    showNotification(
      isAdding ? 'Organizator uspešno dodan med priljubljene!' : 'Organizator uspešno odstranjen iz priljubljenih!', 
      'success'
    );
    
    // Posodobi status v sessionStorage
    try {
      const eventData = sessionStorage.getItem('currentEvent');
      if (eventData) {
        const dogodek = JSON.parse(eventData);
        dogodek.organizatorJePriljubljen = isAdding;
        sessionStorage.setItem('currentEvent', JSON.stringify(dogodek));
      }
    } catch (e) {
      console.error('Napaka pri posodabljanju podatkov v sessionStorage:', e);
    }
  })  .catch(error => {
    console.error('Napaka pri dodajanju/odstranjevanju organizatorja iz priljubljenih:', error);
    
    // Show error notification
    showNotification('Napaka pri upravljanju priljubljenih organizatorjev. Poskusite znova.', 'error');
    
    // V primeru napake vrnemo stanje nazaj
    if (isAdding) {
      icon.classList.remove('bi-heart-fill', 'active');
      icon.classList.add('bi-heart');
      icon.setAttribute('title', 'Dodaj med priljubljene');
      icon.setAttribute('data-bs-original-title', 'Dodaj med priljubljene');
    } else {
      icon.classList.remove('bi-heart');
      icon.classList.add('bi-heart-fill', 'active');
      icon.setAttribute('title', 'Odstrani iz priljubljenih');
      icon.setAttribute('data-bs-original-title', 'Odstrani iz priljubljenih');
    }
    
    // Ponovno inicializiraj tooltip
    new bootstrap.Tooltip(icon, {
      trigger: 'hover',
      boundary: 'window',
      delay: {
        show: 300,
        hide: 100
      }
    });
  });
}

function toggleFavorite(event, id) {
  event.stopPropagation(); // Prepreči klik na starševski element
  const button = event.currentTarget;
  const icon = button.querySelector('.favorite-icon'); // Vedno poišči ikono znotraj gumba
  
  // Uniči obstoječi tooltip pred spremembami
  const tooltip = bootstrap.Tooltip.getInstance(button);
  if (tooltip) {
    tooltip.dispose();
  }
  // Preveri, če je uporabnik prijavljen
  const token = localStorage.getItem('userToken');
  if (!token) {
    showNotification('Za dodajanje med priljubljene se morate prijaviti.', 'warning');
    return;
  }
  
  // Določi ali gre za dodajanje ali odstranjevanje iz priljubljenih
  const isAdding = icon.classList.contains('bi-heart');
  
  // Prikažimo vizualni odziv takoj za boljšo uporabniško izkušnjo
  if (isAdding) {
    // Dodajanje med priljubljene
    icon.classList.remove('bi-heart');
    icon.classList.add('bi-heart-fill', 'active');
    
    // Posodobi tooltip atribute brez vidnega teksta
    button.setAttribute('title', 'Odstrani iz priljubljenih');
    button.setAttribute('data-bs-original-title', 'Odstrani iz priljubljenih');
    
    // Preprosta animacija
    button.classList.add('heart-glow');
    icon.classList.add('heart-pulse');
    
    // Sprostitev plovnih srčkov - niso napolnjeni (false) ko dodajamo med priljubljene
    createFloatingHearts(icon, 3, false, false);
    
    // Odstrani animacijo po končanem predvajanju
    setTimeout(() => {
      icon.classList.remove('heart-pulse');
      button.classList.remove('heart-glow');
    }, 500);
  } else {
    // Odstranjevanje iz priljubljenih
    // Sprostitev plovnih srčkov - roza so (filled=true) ko odstranjujemo iz priljubljenih
    createFloatingHearts(icon, 3, false, true);
    
    icon.classList.remove('bi-heart-fill', 'active');
    icon.classList.add('bi-heart');
    
    // Posodobi tooltip atribute
    button.setAttribute('title', 'Dodaj med priljubljene');
    button.setAttribute('data-bs-original-title', 'Dodaj med priljubljene');
  }
  
  // Ponovno inicializiraj tooltip po spremembi z izboljšanimi nastavitvami
  new bootstrap.Tooltip(button, {
    trigger: 'hover',
    boundary: 'window',
    delay: {
      show: 300,
      hide: 100
    }
  });

  // Klic ustreznega API endpointa
  fetch(`${CONFIG.API_BASE_URL}/dogodki/favorite/${id}`, {
    method: isAdding ? 'POST' : 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP napaka! Status: ${response.status}`);
    }
      console.log(`Dogodek ${id} ${isAdding ? 'dodan med' : 'odstranjen iz'} priljubljene`);
    
    // Show success notification
    showNotification(
      isAdding ? 'Dogodek uspešno dodan med priljubljene!' : 'Dogodek uspešno odstranjen iz priljubljenih!', 
      'success'
    );
    
    // Posodobi status v sessionStorage
    try {
      const eventData = sessionStorage.getItem('currentEvent');
      if (eventData) {
        const dogodek = JSON.parse(eventData);
        dogodek.jePriljubljen = isAdding;
        sessionStorage.setItem('currentEvent', JSON.stringify(dogodek));
      }
    } catch (e) {
      console.error('Napaka pri posodabljanju podatkov v sessionStorage:', e);
    }
  })  .catch(error => {
    console.error('Napaka pri dodajanju/odstranjevanju dogodka iz priljubljenih:', error);
    
    // Show error notification
    showNotification('Napaka pri upravljanju priljubljenih dogodkov. Poskusite znova.', 'error');
    
    // V primeru napake vrnemo stanje nazaj
    if (isAdding) {
      icon.classList.remove('bi-heart-fill', 'active');
      icon.classList.add('bi-heart');
      button.setAttribute('title', 'Dodaj med priljubljene');
      button.setAttribute('data-bs-original-title', 'Dodaj med priljubljene');
    } else {
      icon.classList.remove('bi-heart');
      icon.classList.add('bi-heart-fill', 'active');
      button.setAttribute('title', 'Odstrani iz priljubljenih');
      button.setAttribute('data-bs-original-title', 'Odstrani iz priljubljenih');
    }
    
    // Ponovno inicializiraj tooltip
    new bootstrap.Tooltip(button, {
      trigger: 'hover',
      boundary: 'window',
      delay: {
        show: 300,
        hide: 100
      }
    });
  });
}

/**
 * Inicializiraj Bootstrap tooltips na strani
 */
function initTooltips() {
  // Inicializacija vseh tooltipov (za gumbe, ikone itd.)
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(function(tooltipTriggerEl) {
    // Configure tooltips to only show on hover and not persist
    new bootstrap.Tooltip(tooltipTriggerEl, {
      trigger: 'hover', // Only show on hover, not on click
      boundary: 'window', // Make sure tooltip is constrained to window
      delay: {
        show: 300, // Small delay before showing tooltip
        hide: 100  // Quick hiding of tooltip
      }
    });
  });
}

async function checkFavoriteStatus() {
  try {
    const token = localStorage.getItem('userToken');

    if (!token) {
      console.log('Uporabnik ni prijavljen - ne preverjamo statusa priljubljenega');
      return;
    }
    
    // Get the event from sessionStorage
    const eventData = sessionStorage.getItem('currentEvent');
    if (!eventData) {
      console.log('Podatki o dogodku niso na voljo v sessionStorage');
      return;
    }
    
    const dogodek = JSON.parse(eventData);
    
    // Check if the event is favorite
    const isEventFavorite = dogodek.jePriljubljen === true;
    
    // Update event favorite icon
    const favoriteBtn = document.querySelector('.favorite-btn');
    const favoriteIcon = favoriteBtn ? favoriteBtn.querySelector('.favorite-icon') : null;
    
    if (favoriteIcon && isEventFavorite) {
      favoriteIcon.classList.remove('bi-heart');
      favoriteIcon.classList.add('bi-heart-fill', 'active');
      favoriteBtn.setAttribute('title', 'Odstrani iz priljubljenih');
      favoriteBtn.setAttribute('data-bs-original-title', 'Odstrani iz priljubljenih');
      
      // Re-initialize tooltip
      new bootstrap.Tooltip(favoriteBtn, {
        trigger: 'hover',
        boundary: 'window',
        delay: {
          show: 300,
          hide: 100
        }
      });
    }
    
    // Check if the organizer is favorite
    const organizatorJePriljubljen = dogodek.organizatorJePriljubljen;
    if (organizatorJePriljubljen === true) {
      // Find the organizer favorite icon 
      const organizatorElement = document.querySelector('.event-organizer');
      if (organizatorElement) {
        const organizatorIcon = organizatorElement.querySelector('.favorite-icon');       
        if (organizatorIcon) {
          organizatorIcon.classList.remove('bi-heart');
          organizatorIcon.classList.add('bi-heart-fill', 'active');
          organizatorIcon.setAttribute('title', 'Odstrani iz priljubljenih');
          organizatorIcon.setAttribute('data-bs-original-title', 'Odstrani iz priljubljenih');
          
          // Re-initialize tooltip for organizer icon
          new bootstrap.Tooltip(organizatorIcon, {
            trigger: 'hover',
            boundary: 'window',
            delay: {
              show: 300,
              hide: 100
            }
          });
        } else {
          console.warn('Favorite icon not found in organizer element');
        }
      } else {
        console.warn('Organizer element not found');
      }
    }
  } catch (error) {
    console.error('Napaka pri preverjanju statusa priljubljenosti:', error);
  }
}

/**
 * Funkcija za upravljanje z ocenami dogodka
 * @param {string} action - Akcija: 'add', 'update', 'delete'
 * @param {number} ratingId - ID ocene (za update ali delete)
 * @param {number} rating - Nova vrednost ocene (za add ali update)
 * @param {string} dogodekId - ID dogodka
 * @returns {Promise<boolean>} - Success status
 */
async function manageEventRating(action, ratingId = null, rating = null, dogodekId = null) {
    if (!dogodekId) {
        dogodekId = new URLSearchParams(window.location.search).get('id');
        if (!dogodekId) {
            console.error('Manjkajoč dogodekId za upravljanje ocene');
            return false;
        }
    }
    
    const token = localStorage.getItem('userToken');
    if (!token) {
        console.error('Uporabnik ni prijavljen');
        if (typeof window.showRatingMessage === 'function') {
            window.showRatingMessage('Za upravljanje ocen se morate prijaviti.', 'warning');
        }
        return false;
    }
    
    let url = `${CONFIG.API_BASE_URL}/ocene`;
    let method = 'POST';
    let body = { ocena: rating, id_dogodka: dogodekId };
    
    if (action === 'update' && ratingId) {
        url = `${CONFIG.API_BASE_URL}/ocene/${ratingId}`;
        method = 'PUT';
    } else if (action === 'delete' && ratingId) {
        url = `${CONFIG.API_BASE_URL}/ocene/${ratingId}`;
        method = 'DELETE';
        body = null; // Telo ni potrebno za DELETE
    }
    
    try {
        const fetchOptions = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        if (body) {
            fetchOptions.headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, fetchOptions);
        
        if (response.ok) {
            // Refresh the ratings display
            setTimeout(() => refreshEventRatings(), 200);
            
            // Show success message if showRatingMessage is available
            if (typeof window.showRatingMessage === 'function') {
                let message = '';
                switch (action) {
                    case 'add':
                        message = 'Ocena uspešno dodana!';
                        break;
                    case 'update':
                        message = 'Ocena uspešno posodobljena!';
                        break;
                    case 'delete':
                        message = 'Ocena uspešno odstranjena!';
                        break;
                }
                window.showRatingMessage(message, 'success');
            }
            
            return true;
        } else {
            let errorMessage = `Napaka pri ${action === 'add' ? 'dodajanju' : (action === 'update' ? 'posodabljanju' : 'odstranjevanju')} ocene.`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {}
              console.error('Operacija ocene ni uspela:', errorMessage);
            
            if (typeof window.showRatingMessage === 'function') {
                window.showRatingMessage(errorMessage, 'danger');
            }
            
            return false;
        }
    } catch (error) {        console.error('Napaka pri upravljanju ocene:', error);
        
        if (typeof window.showRatingMessage === 'function') {
            window.showRatingMessage('Prišlo je do napake pri upravljanju ocene. Preverite povezavo s strežnikom.', 'danger');
        }
        
        return false;
    }
}

// Izpostavi funkcijo v globalnem obsegu
window.manageEventRating = manageEventRating;

/**
 * Shrani informacije o trenutni uporabnikovi oceni za kasnejšo uporabo
 * To se uporablja pri spreminjanju ali brisanju ocen
 */
let currentUserRating = null;

// Izpostavi vrednost v globalnem obsegu, da jo lahko dostopajo druge skripte
window.currentUserRating = currentUserRating;

/**
 * Nastavi poslušalce dogodkov za obrazec za dodajanje komentarjev
 * @param {string} dogodekId - ID dogodka
 */
function setupCommentForm(dogodekId) {
    const commentForm = document.getElementById('comment-form');
    if (!commentForm) {
        console.error('Obrazec za komentarje ni bil najden!');
        return;
    }

    // Preveri, če se je dogodek že zgodil
    if (!hasEventHappened()) {
        const textarea = commentForm.querySelector('textarea');
        const submitBtn = commentForm.querySelector('button[type="submit"]');
        
        if (textarea) {
            textarea.disabled = true;
            textarea.placeholder = "Komentiranje bo na voljo po dogodku.";
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        
        return;
    }

    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Preveri, če je uporabnik prijavljen
        if (!isLoggedIn()) {
            // Prikaži opozorilo, da se mora uporabnik prijaviti
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-warning mt-3';
            alertElement.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Za oddajo komentarja se morate <a href="prijava.html">prijaviti</a>.';
            
            const formContainer = document.querySelector('.comment-form-container');
            // Odstrani morebitna predhodna opozorila
            const existingAlert = formContainer.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            formContainer.insertBefore(alertElement, commentForm);
            return;
        }
        
        const commentText = document.getElementById('comment-text').value.trim();
        
        if (!commentText) {
            // Opozori uporabnika, da mora vnesti besedilo
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Prosimo, vnesite besedilo komentarja.';
            
            const formContainer = document.querySelector('.comment-form-container');
            // Odstrani morebitna predhodna opozorila
            const existingAlert = formContainer.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            formContainer.insertBefore(alertElement, commentForm);
            return;
        }
        
        // Prikaži indikator nalaganja
        const submitButton = commentForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Objavljanje...';
          try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                throw new Error('Uporabnik ni prijavljen');
            }
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/komentarji`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    komentar: commentText,
                    id_dogodka: dogodekId
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Napaka pri pošiljanju komentarja');
            }
            
            // Ponastavi obrazec in osveži komentarje
            document.getElementById('comment-text').value = '';
            
            // Prikaži sporočilo o uspehu
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-success mt-3';
            alertElement.innerHTML = '<i class="bi bi-check-circle-fill"></i> Komentar uspešno objavljen!';
            
            const formContainer = document.querySelector('.comment-form-container');
            // Odstrani morebitna predhodna opozorila
            const existingAlert = formContainer.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            formContainer.insertBefore(alertElement, commentForm);
              // Odstrani sporočilo po 5 sekundah
            setTimeout(() => {
                if (alertElement.parentNode === formContainer) {
                    alertElement.remove();
                }
            }, 2000);
            
            // Ponovno naloži ocene in komentarje, da se prikažejo uporabnikove ocene
            fetchEventRatings(dogodekId)
                .then(() => {
                    // Po pridobitvi ocen naloži še komentarje
                    fetchEventComments(dogodekId);
                })
                .catch(() => {
                    // V primeru napake vseeno naloži komentarje
                    fetchEventComments(dogodekId);
                });
              } catch (error) {
            console.error('Napaka pri objavi komentarja:', error);
            
            // Prikaži napako uporabniku
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-danger mt-3';
            alertElement.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${sanitizeErrorMessage(error.message || 'Napaka pri objavi komentarja.')}`;
            
            const formContainer = document.querySelector('.comment-form-container');
            // Odstrani morebitna predhodna opozorila
            const existingAlert = formContainer.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            formContainer.insertBefore(alertElement, commentForm);
        } finally {
            // Ponastavi gumb
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

/**
 * Preveri, če je uporabnik prijavljen
 * @returns {boolean} Ali je uporabnik prijavljen
 */
function isLoggedIn() {
    const token = localStorage.getItem('userToken');
    return !!token; // Pretvori v boolean
}

/**
 * Preveri, če se je dogodek že zgodil glede na datum in čas dogodka
 * @returns {boolean} True, če se je dogodek že zgodil
 */
function hasEventHappened() {
    try {
        const dateElement = document.querySelector('.event-date');
        if (!dateElement) return false;
        const dateStr = dateElement.getAttribute('data-datetime');
        console.log('Preverjanje datuma dogodka:', dateStr);
        if (!dateStr) return false;
        
        const eventDate = new Date(dateStr);
        const now = new Date();
        
        console.log(eventDate, now); 
        return eventDate <= now;
    } catch (error) {
        console.error('Napaka pri preverjanju datuma dogodka:', error);
        // V primeru napake predpostavimo, da se je dogodek že zgodil, da omogočimo funkcionalnost
        return true;
    }
}

/**
 * Prikaže sporočilo za dogodek, ki se še ni zgodil
 * @param {string} section - 'comments' ali 'ratings'
 */
function showFutureEventMessage(section) {
    let container;
    let message;
    
    if (section === 'comments') {
        container = document.querySelector('.comments-list');
        message = 'Komentiranje bo na voljo po dogodku.';
        
        // Onemogoči obrazec za komentiranje
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            const textarea = commentForm.querySelector('textarea');
            const submitBtn = commentForm.querySelector('button[type="submit"]');
            
            if (textarea) {
                textarea.disabled = true;
                textarea.placeholder = "Komentiranje bo na voljo po dogodku.";
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
            }
        }
    } else {
        container = document.querySelector('.event-rating');
        message = 'Ocenjevanje bo na voljo po dogodku.';
    }
    
    if (container) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i> 
                ${message} Vrnite se, ko bo dogodek zaključen.
            </div>
        `;
    }
}