document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registration-form');

    if (registrationForm) {
        // Form validation
        registrationForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!validateForm()) {
                return;
            }
            
            try {
                await registerUser();
            } catch (error) {
                showError(error.message || 'Prišlo je do napake pri registraciji. Prosimo, poskusite znova.');
            }
        });
    }

    // Function to validate the form
    function validateForm() {
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const birthDate = document.getElementById('birth-date').value;
        const password = document.getElementById('password').value;
        
        // Reset previous error messages
        clearErrors();
        
        let isValid = true;
        
        // Validate first name
        if (!firstName || firstName.length > 30) {
            showFieldError('first-name', 'Ime je obvezno in ne sme presegati 30 znakov.');
            isValid = false;
        }
        
        // Validate last name
        if (!lastName || lastName.length > 30) {
            showFieldError('last-name', 'Priimek je obvezen in ne sme presegati 30 znakov.');
            isValid = false;
        }
        
        // Validate email
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        if (!email || !emailRegex.test(email)) {
            showFieldError('email', 'Vnesite veljaven email naslov.');
            isValid = false;
        }
        
        // Validate birth date
        if (!birthDate) {
            showFieldError('birth-date', 'Datum rojstva je obvezen.');
            isValid = false;
        }
          // Validate password (at least 6 characters)
        if (!password || password.length < 6) {
            showFieldError('password', 'Geslo mora vsebovati vsaj 6 znakov.');
            isValid = false;
        }
        
        return isValid;
    }

    // Function to register user
   async function registerUser() {
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const birthDate = document.getElementById('birth-date').value;
    const password = document.getElementById('password').value;

    // Sanitize input data
    const sanitizedFirstName = firstName.replace(/[^\p{L}0-9 ]/gu, '');
    const sanitizedLastName = lastName.replace(/[^\p{L}0-9 ]/gu, '');
    const sanitizedEmail = email.replace(/[^\p{L}0-9@._-]/gu, '');
    const sanitizedBirthDate = birthDate.replace(/[^0-9-]/g, '');
    const sanitizedPassword = password.replace(/[^\p{L}0-9!@#$%^&*()_+]/gu, '');

    const userData = {
        ime: sanitizedFirstName,
        priimek: sanitizedLastName,
        email: sanitizedEmail,
        geslo: sanitizedPassword,
        datumRojstva: sanitizedBirthDate
    };

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        

        if (!response.ok) {
            throw new Error(data.error || 'Napaka pri registraciji');
        }

        localStorage.setItem('userToken', data.token);
        const userInfo = {
            email: email,
            ime: firstName,
            priimek: lastName,
            tipUporabnika: 'Obiskovalec'
        };
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        showSuccessMessage();

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        if (error.message.includes('E-pošta že obstaja')) {
            showError('Ta email naslov je že v uporabi. Prosimo, uporabite drug email ali se prijavite.');
        } else {
            showError(error.message || 'Prišlo je do napake pri registraciji. Prosimo, poskusite znova.');
        }
        throw error;
    }
}    // Helper function to show field-specific errors
    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('is-invalid');
        
        // Find the invalid-feedback div
        let feedbackElement = field.nextElementSibling;
        
        // For password input which is in an input group
        if (fieldId === 'password') {
            feedbackElement = field.parentElement.nextElementSibling;
        }
        
        if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
            feedbackElement.textContent = message;
        }
    }
    
    // Helper function to clear all error messages
    function clearErrors() {
        const inputs = registrationForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('is-invalid');
        });
        
        // Remove any alert messages
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
    }
    
    // Helper function to show error message
    function showError(message) {
        clearErrors();
        
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger mt-3';
        errorAlert.textContent = message;
        
        // Insert before form
        registrationForm.parentNode.insertBefore(errorAlert, registrationForm);
    }
    
    // Helper function to show success message
    function showSuccessMessage() {
        clearErrors();
        
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success mt-3';
        successAlert.textContent = 'Registracija uspešna! Preusmerjanje...';
        
        // Insert before form
        registrationForm.parentNode.insertBefore(successAlert, registrationForm);
    }
});