// filepath: c:\Users\matij\Documents\FERI\PRVI\praktikum\DogodkiVBlizini\src\Frontend\js\event_registration.js
document.addEventListener('DOMContentLoaded', function() {
    // Get event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const dogodekId = urlParams.get('id');

    if (!dogodekId) {
        console.error('ID dogodka ni najden');
        return;
    }

    // Get registration button
    const registerButton = document.querySelector('.cta-button');
    if (!registerButton) {
        console.error('Gumb za prijavo na dogodek ni najden.');
        return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('userToken');
    
    // If no token, change button to redirect to login
    if (!token) {
        registerButton.innerText = 'Za prijavo je potrebno ustvariti račun';
        registerButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = `prijava.html?redirect=podrobnosti_dogodka.html?id=${dogodekId}`;
        });
        return;
    }

    // Check if user is already registered for this event
    checkRegistrationStatus(dogodekId, token);

    // Add event listener to the button
    registerButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // If user is not logged in, redirect to login
        if (!token) {
            window.location.href = `prijava.html?redirect=podrobnosti_dogodka.html?id=${dogodekId}`;
            return;
        }

        // Toggle registration based on current status
        if (registerButton.dataset.registered === 'true') {
            unregisterFromEvent(dogodekId, token);
        } else {
            registerForEvent(dogodekId, token);
        }
    });
});

/**
 * Check if user is registered for an event
 * @param {string} dogodekId - The event ID
 * @param {string} token - User's authentication token
 */
async function checkRegistrationStatus(dogodekId, token) {
    try {
        // Get registration button
        const registerButton = document.querySelector('.cta-button');
        
        // Get all user registrations
        const response = await fetch(`${CONFIG.API_BASE_URL}/prijava/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Napaka pri preverjanju prijave');
        }

        const userRegistrations = await response.json();
        
        // Check if user is registered for this event
        const isRegistered = userRegistrations.some(prijava => 
            prijava.TK_dogodek == dogodekId
        );        // Update button text and dataset based on registration status
        if (isRegistered) {
            registerButton.innerText = 'Odjavi se z dogodka';
            registerButton.classList.remove('btn-primary');
            registerButton.classList.add('btn-danger');
            registerButton.dataset.registered = 'true';
        } else {
            registerButton.innerText = 'Prijava na dogodek';
            registerButton.classList.remove('btn-danger');
            registerButton.classList.add('btn-primary');
            registerButton.dataset.registered = 'false';
        }
        
        // Remove focus to ensure immediate visual update
        registerButton.blur();
    } catch (error) {
        console.error('Napaka pri preverjanju prijave:', error);
        showNotification('Napaka pri preverjanju prijave na dogodek', 'error');
    }
}

/**
 * Register user for an event
 * @param {string} dogodekId - The event ID
 * @param {string} token - User's authentication token
 */
async function registerForEvent(dogodekId, token) {
    try {
        const registerButton = document.querySelector('.cta-button');
        
        // Set button to loading state
        const originalText = registerButton.innerText;
        registerButton.innerText = 'Prijavljanje...';
        registerButton.disabled = true;
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/prijava`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dogodekId })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Napaka pri prijavi na dogodek');
        }        // Update button to show registered status
        registerButton.innerText = 'Odjavi se z dogodka';
        registerButton.classList.remove('btn-primary');
        registerButton.classList.add('btn-danger');
        registerButton.dataset.registered = 'true';
        registerButton.disabled = false;
        
        // Remove focus to ensure immediate visual update
        registerButton.blur();
        
        // Show success notification
        showNotification('Uspešno ste se prijavili na dogodek!', 'success');
    } catch (error) {
        console.error('Napaka pri prijavi na dogodek:', error);
        
        // Reset button state
        const registerButton = document.querySelector('.cta-button');
        registerButton.innerText = 'Prijava na dogodek';
        registerButton.disabled = false;
        
        // Show error notification
        showNotification(error.message || 'Napaka pri prijavi na dogodek', 'error');
    }
}

/**
 * Unregister user from an event
 * @param {string} dogodekId - The event ID
 * @param {string} token - User's authentication token
 */
async function unregisterFromEvent(dogodekId, token) {
    try {
        const registerButton = document.querySelector('.cta-button');
        
        // Set button to loading state
        registerButton.innerText = 'Odjavljanje...';
        registerButton.disabled = true;
        
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
        }        // Update button to show unregistered status
        registerButton.innerText = 'Prijava na dogodek';
        registerButton.classList.remove('btn-danger');
        registerButton.classList.add('btn-primary');
        registerButton.dataset.registered = 'false';
        registerButton.disabled = false;
        
        // Remove focus to ensure immediate visual update
        registerButton.blur();
        
        // Show success notification
        showNotification('Uspešno ste se odjavili z dogodka!', 'success');
    } catch (error) {
        console.error('Napaka pri odjavi z dogodka:', error);
        
        // Reset button state
        const registerButton = document.querySelector('.cta-button');
        registerButton.innerText = 'Odjavi se z dogodka';
        registerButton.disabled = false;
        
        // Show error notification
        showNotification(error.message || 'Napaka pri odjavi z dogodka', 'error');
    }
}

// Note: showNotification and getAlertTypeClass functions are now loaded from notifications.js