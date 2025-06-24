/**
 * Nastavi event listenerje za ocenjevalne zvezdice
 */
function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-star');
    const ratingContainer = document.querySelector('.your-rating');
    
    if (!stars.length || !ratingContainer) return;
      // Dodaj poslušalce dogodkov na gumbe za ocenjevanje, če obstajajo
    const changeRatingBtn = ratingContainer.querySelector('.change-rating-btn');
    const removeRatingBtn = ratingContainer.querySelector('.remove-rating-btn');
    
    if (changeRatingBtn) {
        changeRatingBtn.addEventListener('click', function() {            
            // Preveri, če je uporabnik prijavljen
            const token = localStorage.getItem('userToken');
            if (!token) {
                showRatingMessage('Za spremembo ocene se morate prijaviti.', 'warning');
                return;
            }            
            // Shrani obstoječi ID ocene uporabnika za posodobitev
            const userRatingObj = window.currentUserRating;
            if (!userRatingObj) {
                showRatingMessage('Napaka pri pridobivanju vaše ocene.', 'danger');
                return;
            }
            
            const ratingId = userRatingObj.id || userRatingObj.idOcena;
            const dogodekId = new URLSearchParams(window.location.search).get('id');
            
            if (!ratingId) {
                showRatingMessage('Napaka: ID ocene ni bil najden.', 'danger');
                return;
            }
              // Omogoči zvezdice za spremembo ocene
            stars.forEach(star => {
                star.classList.remove('disabled');
                star.title = "Kliknite za novo oceno";
                star.style.cursor = "pointer";
                  // Najprej odstrani vse obstoječe obravnalce klikov, da se izogneš podvojenim
                const newClickHandler = async function() {
                    const newRating = parseInt(this.dataset.rating);
                      // Prikaži animacijo nalaganja
                    stars.forEach(s => s.classList.add('disabled'));
                    
                    const loadingIndicator = document.createElement('div');
                    loadingIndicator.className = 'spinner-border spinner-border-sm ms-2 rating-loading';
                    loadingIndicator.setAttribute('role', 'status');
                    loadingIndicator.innerHTML = '<span class="visually-hidden">Nalaganje...</span>';
                    
                    const ratingStarsContainer = ratingContainer.querySelector('.star-rating');
                    ratingStarsContainer.appendChild(loadingIndicator);
                    
                    try {
                        const token = localStorage.getItem('userToken');
                        const response = await fetch(`${CONFIG.API_BASE_URL}/ocene/${ratingId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                ocena: newRating,
                                id_dogodka: dogodekId
                            })
                        });
                        
                        loadingIndicator.remove();
                        
                        if (response.ok) {                            
                            // Ponovno prikaži akcijske gumbe
                            const actionsDiv = ratingContainer.querySelector('.rating-actions');
                            if (actionsDiv) actionsDiv.classList.remove('d-none');
                              // Posodobi globalno uporabnikovo oceno
                            if (window.currentUserRating) {
                                window.currentUserRating.ocena = newRating;
                            }
                            
                            // Osveži prikaz ocen
                            if (typeof window.refreshEventRatings === 'function') {
                                window.refreshEventRatings();
                            }
                            
                            // Sproži dogodek za obvestilo o spremembi ocene
                            document.dispatchEvent(new CustomEvent('ratingChange', {
                                detail: { rating: newRating, dogodekId: dogodekId }
                            }));
                        } else {
                            showRatingMessage('Napaka pri posodabljanju ocene.', 'danger');
                        }
                    } catch (error) {
                        console.error('Napaka pri posodabljanju ocene:', error);
                        loadingIndicator.remove();
                        showRatingMessage('Prišlo je do napake pri posodabljanju ocene.', 'danger');
                    }
                      // Odstrani obravnalnik klika po uporabi
                    stars.forEach(s => {
                        s.removeEventListener('click', newClickHandler);
                    });
                };
                  // Najprej odstrani vse obstoječe obravnalce, da se izogneš podvojenim
                star.replaceWith(star.cloneNode(true));
                // Pridobi svežo referenco po kloniranju
                const freshStar = ratingContainer.querySelector(`.rating-star[data-rating="${star.dataset.rating}"]`);
                // Dodaj nov obravnalec
                freshStar.addEventListener('click', newClickHandler);
                
                // Animiraj zvezdice, da nakažeš, da so interaktivne
                freshStar.classList.add('can-update');
                setTimeout(() => freshStar.classList.remove('can-update'), 1000);
            });
              // Prikaži sporočilo
            showRatingMessage('Izberite novo oceno.', 'info');
            
            // Skrij akcijske gumbe med spreminjanjem ocene
            const actionsDiv = this.parentNode;
            actionsDiv.classList.add('d-none');
            
            // Dodaj časovni zamik za ponovni prikaz gumbov, če uporabnik ne izbere nove ocene
            setTimeout(() => {
                if (actionsDiv.classList.contains('d-none')) {
                    actionsDiv.classList.remove('d-none');
                    showRatingMessage('Čas za ocenjevanje je potekel. Poskusite znova.', 'warning');
                }
            }, 30000); // Ponovno prikaži gumbe po 30 sekundah neaktivnosti
        });
    }
    
    if (removeRatingBtn) {
        removeRatingBtn.addEventListener('click', async function() {            // Onemogoči gumb za preprečitev večkratnih klikov
            this.disabled = true;
            
            const token = localStorage.getItem('userToken');
            if (!token) {
                showRatingMessage('Za urejanje ocene se morate prijaviti.', 'warning');
                this.disabled = false;
                return;
            }              // Pridobi ID ocene iz globalne spremenljivke, ki smo jo nastavili v dogodek_podrobnosti.js
            const userRatingObj = window.currentUserRating;
            if (!userRatingObj) {
                showRatingMessage('Napaka pri pridobivanju vaše ocene.', 'danger');
                this.disabled = false;
                return;
            }
            
            const ratingId = userRatingObj.id || userRatingObj.idOcena;
            if (!ratingId) {
                showRatingMessage('Napaka: ID ocene ni bil najden.', 'danger');
                this.disabled = false;
                return;
            }
            
            const dogodekId = new URLSearchParams(window.location.search).get('id');
              // Prikaži indikator nalaganja
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'spinner-border spinner-border-sm ms-2 rating-loading';
            loadingIndicator.setAttribute('role', 'status');
            loadingIndicator.innerHTML = '<span class="visually-hidden">Nalaganje...</span>';
            
            this.appendChild(loadingIndicator);
            
            try {                
                console.log(`Brisanje ocene z ID: ${ratingId}`);
                
                const isRemoved = await window.removeUserRating(ratingId);
                
                // Odstrani indikator nalaganja
                loadingIndicator.remove();
                this.disabled = false;
                  if (isRemoved) {                    
                    // Ponastavi globalne spremenljivke, saj ocena ne obstaja več
                    window.currentUserRatingObj = null;
                    window.currentUserRating = null;
                    
                    // Ponastavi zvezdice na prazno stanje
                    stars.forEach(star => {
                        star.classList.remove('bi-star-fill');
                        star.classList.add('bi-star');
                        star.classList.remove('disabled');
                    });
                    
                    // Skrij akcijske gumbe
                    const actionsDiv = this.parentNode;
                    actionsDiv.classList.add('d-none');
                    
                    // Osveži prikaz ocen
                    if (typeof window.refreshEventRatings === 'function') {
                        window.refreshEventRatings();
                    } else {
                        // Nadomestna rešitev, če funkcija za osvežitev ni na voljo
                        fetch(`${CONFIG.API_BASE_URL}/ocene?id_dogodka=${dogodekId}`)
                            .then(res => res.ok ? res.json() : null)
                            .then(data => {
                                if (data && typeof window.displayRatings === 'function') {
                                    window.displayRatings(data);
                                } else {
                                    window.location.reload();
                                }
                            })
                            .catch(err => {                                
                                console.error('Napaka pri osveževanju ocen:', err);
                                window.location.reload();
                            });                    }
                } else {
                    showRatingMessage('Napaka pri odstranjevanju ocene.', 'danger');
                }
            } catch (error) {
                console.error('Napaka pri odstranjevanju ocene:', error);
                loadingIndicator.remove();
                this.disabled = false;
                showRatingMessage('Prišlo je do napake pri odstranjevanju ocene. Preverite povezavo s strežnikom.', 'danger');
            }
        });
    }
      // Preveri za obstoječo oceno v DOM (zvezdice so že nastavljene in aktivne)
    const activeStars = ratingContainer.querySelectorAll('.rating-star.bi-star-fill');
    if (activeStars.length > 0) {        
        // Dodaj CSS za animacijo, če še ne obstaja
        if (!document.querySelector('#rating-update-styles')) {
            const style = document.createElement('style');
            style.id = 'rating-update-styles';
            style.textContent = `
                .rating-star.can-update {
                    animation: pulse-star 1s ease;
                }
                @keyframes pulse-star {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                .rating-star:hover {
                    transform: scale(1.15);
                    transition: transform 0.2s ease;
                }
                .rating-actions .btn {
                    transition: all 0.2s ease;
                }
                .rating-actions .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .rating-star.updating {
                    color: #ff9800;
                    animation: pulse-continuous 1.5s infinite alternate;
                }
                @keyframes pulse-continuous {
                    0% { transform: scale(1); opacity: 0.7; }
                    100% { transform: scale(1.15); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        stars.forEach(star => {
            star.title = "Za spremembo ocene uporabite gumb 'Spremeni oceno'";
            star.style.cursor = "default";
              // Nežno animiraj zvezdice ob nalaganju strani, da nakažeš, da so interaktivne
            setTimeout(() => {
                star.classList.add('can-update');
                setTimeout(() => star.classList.remove('can-update'), 1000);
            }, 500);
        });
        
        return;
    }
    
    stars.forEach(star => {
        star.addEventListener('click', async function() {
            const rating = parseInt(this.dataset.rating);
            const dogodekId = new URLSearchParams(window.location.search).get('id');
            
            if (!dogodekId) return;
            
            // Preveri, če je uporabnik prijavljen
            const token = localStorage.getItem('userToken');
            if (!token) {
                showRatingMessage('Za oddajo ocene se morate prijaviti.', 'warning');
                
                // Prikaži povezavo za prijavo
                const loginLink = document.createElement('div');
                loginLink.className = 'mt-3 text-center login-redirect';
                loginLink.innerHTML = '<a href="prijava.html?redirect=podrobnosti_dogodka.html?id=' + dogodekId + '" class="btn btn-primary">Prijava</a>';
                
                // Odstrani obstoječe povezave, če obstajajo
                const existingLinks = ratingContainer.querySelectorAll('.login-redirect');
                existingLinks.forEach(link => link.remove());
                
                ratingContainer.appendChild(loginLink);
                return;
            }
            
            try {
                // Dekodiranje JWT tokena za pridobitev ID uporabnika
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const userId = payload.idUporabnik || payload.id;
                    
                    // Pridobi obstoječe ocene za dogodek
                    const response = await fetch(`${CONFIG.API_BASE_URL}/ocene?id_dogodka=${dogodekId}`);
                    
                    if (response.ok) {
                        const ocene = await response.json();
                        
                        // Preveri, če je uporabnik že ocenil dogodek
                        const userRating = ocene.find(ocena => 
                            (ocena.TK_uporabnik === userId || ocena.id_uporabnika === userId)
                        );
                        // Če uporabnik že ima oceno, jo bomo posodobili namesto dodali novo
                        // Shranjujemo ID ocene za uporabo pri PUT zahtevi
                    }
                }
            } catch (error) {
                console.error('Napaka pri preverjanju uporabnikove ocene:', error);
            }
            
            // Označi zvezdice in dodaj indikator nalaganja
            stars.forEach(s => {
                s.classList.add('disabled');
                if (parseInt(s.dataset.rating) <= rating) {
                    s.classList.remove('bi-star');
                    s.classList.add('bi-star-fill');
                } else {
                    s.classList.remove('bi-star-fill');
                    s.classList.add('bi-star');
                }
            });
            
            // Dodaj indikator nalaganja
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'spinner-border spinner-border-sm ms-2 rating-loading';
            loadingIndicator.setAttribute('role', 'status');
            loadingIndicator.innerHTML = '<span class="visually-hidden">Nalaganje...</span>';
            
            // Odstrani obstoječe sporočilo in indikator nalaganja
            const existingMsg = ratingContainer.querySelector('.rating-message');
            if (existingMsg) existingMsg.remove();
            
            const existingLoading = ratingContainer.querySelector('.rating-loading');
            if (existingLoading) existingLoading.remove();
            
            const ratingStarsContainer = ratingContainer.querySelector('.star-rating');
            ratingStarsContainer.appendChild(loadingIndicator);
            
            try {
                // Poglej ce je uporabnik že oddal oceno
                let userRatingId = null;
                let isUpdatingRating = false;
                
                try {
                    const tokenParts = token.split('.');
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const userId = payload.idUporabnik || payload.id;
                    
                    const ratingsResponse = await fetch(`${CONFIG.API_BASE_URL}/ocene?id_dogodka=${dogodekId}`);
                    if (ratingsResponse.ok) {
                        const ocene = await ratingsResponse.json();
                        const existingRating = ocene.find(ocena => 
                            (ocena.TK_uporabnik === userId || ocena.id_uporabnika === userId)
                        );
                        
                        if (existingRating) {
                            userRatingId = existingRating.idOcena || existingRating.id;
                            isUpdatingRating = true;
                        }
                    }                } catch (e) {
                    console.error('Napaka pri preverjanju obstoječe ocene:', e);
                }
                
                let url = `${CONFIG.API_BASE_URL}/ocene`;
                let method = 'POST';
                
                // Če posodabljamo obstoječo oceno
                if (isUpdatingRating && userRatingId) {
                    url = `${CONFIG.API_BASE_URL}/ocene/${userRatingId}`;
                    method = 'PUT';
                }
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ocena: rating,
                        id_dogodka: dogodekId
                    })
                });
                
                // Odstrani indikator nalaganja
                loadingIndicator.remove();
                
                // Omogoči zvezdice
                stars.forEach(s => s.classList.remove('disabled'));
                
                if (response.ok) {                    
                    // Osveži prikaz ocen z globalno funkcijo iz dogodek_podrobnosti.js                    
                    console.log('Osveževanje ocen po uspešnem pošiljanju');
                    
                    // Po oddaji ocene pridobi posodobljene podatke o oceni iz odgovora, če so na voljo
                    let updatedRating = null;
                    try {
                        const responseData = await response.json().catch(() => null);
                        if (responseData && responseData.id) {
                            updatedRating = responseData;
                            // Shrani objekt ocene za kasnejšo uporabo
                            window.currentUserRating = updatedRating;
                        }                    } catch (e) {
                        console.log('Ni bilo mogoče razčleniti podatkov iz odgovora:', e);
                    }
                    
                    // 1. Najprej uporabi timeout da damo nekaj časa strežniku za procesiranje
                    setTimeout(() => {
                        try {
                            // 2. Poskušamo uporabiti globalno funkcijo refreshEventRatings
                            if (typeof window.refreshEventRatings === 'function') {                                
                                console.log('Uporaba funkcije window.refreshEventRatings');
                                window.refreshEventRatings();
                            } else if (typeof refreshEventRatings === 'function') {
                                console.log('Uporaba lokalne funkcije refreshEventRatings');
                                refreshEventRatings();
                            } else {
                                // 3. Fallback - direktno osvežimo podatke sami
                                console.log('Uporaba ročne alternative za osvežitev');
                                fetch(`${CONFIG.API_BASE_URL}/ocene?id_dogodka=${dogodekId}`)
                                    .then(res => {
                                        if (!res.ok) {                                            
                                            console.error('Napaka pri pridobivanju posodobljenih ocen:', res.status);
                                            return null;
                                        }
                                        return res.json();
                                    })
                                    .then(ocene => {
                                        if (ocene) {
                                            console.log('Prejete posodobljene ocene:', ocene);
                                            
                                            // Poišči uporabnikovo oceno v novih podatkih, če je nismo dobili iz odgovora
                                            if (!updatedRating) {
                                                try {
                                                    const tokenParts = token.split('.');
                                                    if (tokenParts.length === 3) {
                                                        const payload = JSON.parse(atob(tokenParts[1]));
                                                        const userId = payload.idUporabnik || payload.id;
                                                          // Poišči uporabnikovo oceno
                                                        const userRating = ocene.find(ocena => 
                                                            (ocena.TK_uporabnik === userId || ocena.id_uporabnika === userId)
                                                        );
                                                          if (userRating) {
                                                            // Shrani oceno za kasnejšo uporabo
                                                            window.currentUserRating = userRating;
                                                        }
                                                    }
                                                } catch (error) {
                                                    console.error('Napaka pri iskanju uporabnikove ocene:', error);
                                                }
                                            }
                                              if (typeof window.displayRatings === 'function') {
                                                console.log('Uporaba funkcije window.displayRatings');
                                                window.displayRatings(ocene);
                                            } else if (typeof displayRatings === 'function') {
                                                console.log('Uporaba lokalne funkcije displayRatings');
                                                displayRatings(ocene);
                                            } else {
                                                console.error('Funkcija displayRatings ni bila najdena');
                                                console.log('Prisilno osveževanje strani kot zadnja možnost');
                                                window.location.reload();
                                            }
                                        }                                    
                                    }).catch(error => {
                                        console.error('Napaka pri alternativi za osvežitev ocen:', error);
                                    });
                            }
                        } catch (error) {
                            console.error('Napaka med osveževanjem ocen:', error);
                            window.location.reload();
                        }                    }, 200);
                      // Sproži prilagojen dogodek, ki obvesti o spremembi ocene
                    document.dispatchEvent(new CustomEvent('ratingChange', {
                        detail: { rating: rating, dogodekId: dogodekId }
                    }));
                } else if (response.status === 401) {
                    // Uporabnik ni prijavljen ali pa je veljavnost tokena potekla
                    showRatingMessage('Vaša seja je potekla. Prosimo, prijavite se ponovno.', 'warning');
                    // Odstrani token
                    localStorage.removeItem('userToken');
                } else if (response.status === 400) {
                    try {
                        const errorData = await response.json();
                        showRatingMessage(errorData.error || 'Napaka: Ta dogodek ste že ocenili.', 'warning');
                    } catch (e) {
                        showRatingMessage('Ta dogodek ste že ocenili.', 'warning');
                    }
                } else {
                    // Prikaz napake iz strežnika
                    const errorData = await response.json();
                    showRatingMessage('Napaka: ' + (errorData.error || 'Neznana napaka'), 'danger');
                }
            } catch (error) {
                // Odstrani indikator nalaganja
                loadingIndicator.remove();
                
                // Omogoči zvezdice
                stars.forEach(s => s.classList.remove('disabled'));
                
                console.error('Napaka pri oddaji ocene:', error);
                showRatingMessage('Prišlo je do napake pri oddaji ocene. Preverite povezavo s strežnikom.', 'danger');
            }
        });
          // Efekti ob prehodu miške
        star.addEventListener('mouseenter', function() {
            if (!this.classList.contains('disabled')) {
                const rating = parseInt(this.dataset.rating);
                stars.forEach(s => {
                    if (parseInt(s.dataset.rating) <= rating) {
                        s.classList.add('hover');
                    }
                });
            }
        });
        
        star.addEventListener('mouseleave', function() {
            stars.forEach(s => s.classList.remove('hover'));
        });
    });
    
    /**
     * Prikaže sporočilo pod ocenami
     * @param {string} message - Besedilo sporočila
     * @param {string} type - Tip sporočila (success, warning, danger, info)
     */    function showRatingMessage(message, type = 'success') {
        // Odstrani obstoječe sporočilo, če obstaja
        const existingMsg = ratingContainer.querySelector('.rating-message');
        if (existingMsg) existingMsg.remove();
        
        // Ustvari novo sporočilo
        const messageElement = document.createElement('div');
        messageElement.className = `rating-message alert alert-${type} mt-3 mb-2 py-2 px-3`;
        messageElement.style.fontSize = '0.95rem';
        messageElement.style.fontWeight = '500';
        messageElement.style.backgroundColor = type === 'warning' ? '#fff3cd' : 
                                             (type === 'danger' ? '#f8d7da' : 
                                             (type === 'success' ? '#d1e7dd' : '#cff4fc'));
        messageElement.style.color = type === 'warning' ? '#664d03' : 
                                   (type === 'danger' ? '#842029' : 
                                   (type === 'success' ? '#0f5132' : '#055160'));
        messageElement.style.borderRadius = '4px';
        messageElement.style.border = '1px solid ' + 
                                   (type === 'warning' ? '#ffecb5' : 
                                   (type === 'danger' ? '#f5c2c7' : 
                                   (type === 'success' ? '#badbcc' : '#b6effb')));
        messageElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        
        // Nastavi ikono glede na tip sporočila
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'warning') icon = 'exclamation-triangle';
        else if (type === 'danger') icon = 'exclamation-circle';
        
        messageElement.innerHTML = `<i class="bi bi-${icon} me-2"></i> ${message}`;
        
        ratingContainer.appendChild(messageElement);
        
        // Odstrani sporočilo po 5 sekundah za success in warning
        if (type !== 'danger') {
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
        }
    }
}

// Izpostavi funkcijo setupRatingStars v globalnem obsegu
window.setupRatingStars = setupRatingStars;
// Izpostavi tudi kot setupRatingStarsFromOcene za preprečevanje konfliktov imen
window.setupRatingStarsFromOcene = setupRatingStars;

/**
 * Globalna funkcija za prikaz sporočil pri ocenjevanju
 * @param {string} message - Besedilo sporočila
 * @param {string} type - Tip sporočila (success, warning, danger, info)
 */
window.showRatingMessage = function(message, type = 'success') {
    const ratingContainer = document.querySelector('.your-rating');
    if (!ratingContainer) return;
    
    // Odstrani obstoječe sporočilo, če obstaja
    const existingMsg = ratingContainer.querySelector('.rating-message');
    if (existingMsg) existingMsg.remove();
    
    // Ustvari novo sporočilo
    const messageElement = document.createElement('div');
    messageElement.className = `rating-message alert alert-${type} mt-3 mb-2 py-2 px-3`;
    messageElement.style.fontSize = '0.95rem';
    messageElement.style.fontWeight = '500';
    messageElement.style.backgroundColor = type === 'warning' ? '#fff3cd' : 
                                         (type === 'danger' ? '#f8d7da' : 
                                         (type === 'success' ? '#d1e7dd' : '#cff4fc'));
    messageElement.style.color = type === 'warning' ? '#664d03' : 
                               (type === 'danger' ? '#842029' : 
                               (type === 'success' ? '#0f5132' : '#055160'));
    messageElement.style.borderRadius = '4px';
    messageElement.style.border = '1px solid ' + 
                               (type === 'warning' ? '#ffecb5' : 
                               (type === 'danger' ? '#f5c2c7' : 
                               (type === 'success' ? '#badbcc' : '#b6effb')));
    messageElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
    
    // Nastavi ikono glede na tip sporočila
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';
    else if (type === 'danger') icon = 'exclamation-circle';
    
    messageElement.innerHTML = `<i class="bi bi-${icon} me-2"></i> ${message}`;
    
    ratingContainer.appendChild(messageElement);
    
    // Odstrani sporočilo po 15 sekundah za success in warning (podaljšano iz 5 na 15 sekund)
    if (type !== 'danger') {
        setTimeout(() => {
            messageElement.remove();
        }, 15000);
    }
};

/**
 * Odstrani oceno uporabnika
 * @param {number} ratingId - ID ocene za odstranitev
 * @returns {Promise<boolean>} - True če je bila ocena uspešno odstranjena
 */
async function removeUserRating(ratingId) {
    if (!ratingId) {
        console.error('Manjka ID ocene za odstranitev');
        return false;
    }
    
    const token = localStorage.getItem('userToken');
    if (!token) {
        console.error('Uporabnik ni prijavljen');
        return false;
    }
    
    try {        
        console.log(`Brisanje ocene z ID: ${ratingId}`);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/ocene/${ratingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP napaka: ${response.status}` }));
            console.error('Neuspešno brisanje ocene:', errorData.error || response.statusText);
            return false;
        }
        
        console.log('Ocena uspešno odstranjena');
          // Sproži prilagojen dogodek, ki obvesti o brisanju ocene
        // Ta bo sprožil poslušalec dogodkov, ki smo ga dodali v dogodek_podrobnosti.js
        document.dispatchEvent(new CustomEvent('ratingDeleted', { 
            detail: { ratingId: ratingId }
        }));
        
        return true;    
    } catch (error) {
        console.error('Napaka pri odstranjevanju ocene:', error);
        return false;
    }
}

// Izpostavi funkcijo globalno
window.removeUserRating = removeUserRating;
