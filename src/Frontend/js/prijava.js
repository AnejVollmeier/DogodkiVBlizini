document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const togglePasswordButton = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    if (togglePasswordButton) {
        togglePasswordButton.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle eye icon
            const eyeIcon = this.querySelector('i');
            eyeIcon.classList.toggle('bi-eye');
            eyeIcon.classList.toggle('bi-eye-slash');
        });
    }

    if (loginForm) {
        // Form validation and submission
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!validateForm()) {
                return;
            }
            
            try {
                await loginUser();
            } catch (error) {
                console.error('Login error:', error);
                showError('Prišlo je do napake pri prijavi. Prosimo, poskusite znova.');
            }
        });
    }

    // Function to validate the form
    function validateForm() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Reset previous error messages
        clearErrors();
        
        let isValid = true;
        
        // Validate email
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        if (!email || !emailRegex.test(email)) {
            showFieldError('email', 'Vnesite veljaven email naslov.');
            isValid = false;
        }
        
        // Validate password
        if (!password) {
            showFieldError('password', 'Geslo je obvezno.');
            isValid = false;
        }
        
        return isValid;
    }

    // Function to login user
   async function loginUser() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    const loginData = {
        email: email,
        password: password
    };

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Napaka pri prijavi');
        }

        const data = await response.json();
        
        // Shrani podatke v localStorage - ZAJEMI VSE PODATKE!
        localStorage.setItem('userToken', data.token);
        
        // POMEMBNO: Shrani vse podatke o uporabniku
        localStorage.setItem('userInfo', JSON.stringify({
            id: data.id, // Če API vrne ID
            email: email,
            ime: data.ime,
            priimek: data.priimek,
            tipUporabnika: data.tipUporabnika
        }));

        showSuccessMessage();

        // Redirect to home page after successful login
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Prišlo je do napake pri prijavi. Prosimo, poskusite znova.');
    }
}
    // Pomožne funkcije ostanejo enake...
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
    
    function clearErrors() {
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('is-invalid');
        });
        
        // Remove any alert messages
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => {
            if (!alert.id || alert.id !== 'login-error') {
                alert.remove();
            } else {
                alert.classList.add('d-none');
            }
        });
    }
    
    function showError(message) {
        clearErrors();
        
        // Check if there's an error alert container
        let errorAlert = document.getElementById('login-error');
        
        if (errorAlert) {
            errorAlert.textContent = message;
            errorAlert.classList.remove('d-none');
        } else {
            // Create error alert if it doesn't exist
            errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            errorAlert.textContent = message;
            
            // Insert before form content
            loginForm.firstElementChild.before(errorAlert);
        }
    }
    
    function showSuccessMessage() {
        clearErrors();
        
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success mt-3';
        successAlert.textContent = 'Prijava uspešna! Preusmerjanje...';
        
        // Insert at the top of the form
        loginForm.firstElementChild.before(successAlert);
    }
});