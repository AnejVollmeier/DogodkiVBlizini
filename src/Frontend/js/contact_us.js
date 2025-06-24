document.addEventListener('DOMContentLoaded', function() {    
    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        // Form validation
        contactForm.addEventListener('submit', function(event) {
          event.preventDefault();
          
          // Get form fields
          const nameField = document.getElementById('contact-name');
          const emailField = document.getElementById('contact-email');
          const subjectField = document.getElementById('contact-subject');
          const messageField = document.getElementById('contact-message');
          
          // Validate fields
          let isValid = true;
          
          // Name validation
          if (!nameField.value.trim()) {
            markInvalid(nameField, 'Prosimo, vnesite vaše ime');
            isValid = false;
          } else {
            markValid(nameField);
          }
          
          // Email validation
          if (!emailField.value.trim()) {
            markInvalid(emailField, 'Prosimo, vnesite vaš e-naslov');
            isValid = false;
          } else if (!isValidEmail(emailField.value)) {
            markInvalid(emailField, 'Prosimo, vnesite veljaven e-naslov');
            isValid = false;
          } else {
            markValid(emailField);
          }
          
          // Subject validation
          if (!subjectField.value.trim()) {
            markInvalid(subjectField, 'Prosimo, vnesite zadevo');
            isValid = false;
          } else {
            markValid(subjectField);
          }
          
          // Message validation
          if (!messageField.value.trim()) {
            markInvalid(messageField, 'Prosimo, vnesite vaše sporočilo');
            isValid = false;
          } else {
            markValid(messageField);
          }
          
          // If form is valid, submit it
          if (isValid) {
            submitForm();
          }
        });
        
        // Add input event listeners to reset validation styles on input
        const formInputs = contactForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
          input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            this.classList.remove('is-valid');
            
            // Remove any existing feedback elements
            const feedbackElement = this.parentNode.querySelector('.invalid-feedback');
            if (feedbackElement) {
              feedbackElement.remove();
            }
          });
        });
      }
      
      // Helper function to validate email format
      function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
      
      // Helper function to mark field as invalid
      function markInvalid(field, message) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        
        // Remove any existing feedback elements
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (existingFeedback) {
          existingFeedback.remove();
        }
        
        // Add error message
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'invalid-feedback';
        feedbackDiv.textContent = message;
        field.parentNode.appendChild(feedbackDiv);
      }
      
      // Helper function to mark field as valid
      function markValid(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        
        // Remove any existing feedback elements
        const feedbackElement = field.parentNode.querySelector('.invalid-feedback');
        if (feedbackElement) {
          feedbackElement.remove();
        }
      }

        
    // Function to submit form data
    function submitForm() {
      const formData = {
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email').value,
        subject: document.getElementById('contact-subject').value,
        message: document.getElementById('contact-message').value
      };
      
      // Show loading state
      const submitButton = contactForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Pošiljanje...';
      
      // Send data to Node.js backend
      fetch(`${CONFIG.API_BASE_URL}/email/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Form submitted successfully:', data);
        showSuccessMessage();
        resetForm();
      })
      .catch(error => {
        console.error('Error submitting form:', error);
        showErrorMessage();
        resetButtonState();
      });
      
      // Helper function to reset form
      function resetForm() {
        // Reset form
        contactForm.reset();
        
        // Reset validation styles
        const formInputs = contactForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
          input.classList.remove('is-valid');
        });
        
        // Reset button state
        resetButtonState();
      }
      
      function resetButtonState() {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    }
    
    // Function to show success message
    function showSuccessMessage() {
      // Remove any existing alert
      const existingAlert = document.querySelector('.contact-form-alert');
      if (existingAlert) {
        existingAlert.remove();
      }
      
      // Create success alert
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-success mt-4 contact-form-alert';
      alertDiv.role = 'alert';
      alertDiv.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Hvala za vaše sporočilo! Odgovorili vam bomo v najkrajšem možnem času.';
      
      // Insert alert before the form
      contactForm.parentNode.insertBefore(alertDiv, contactForm);
      
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        alertDiv.classList.add('fade');
        setTimeout(() => alertDiv.remove(), 500);
      }, 5000);
    }
    
    // Function to show error message
    function showErrorMessage() {
      // Remove any existing alert
      const existingAlert = document.querySelector('.contact-form-alert');
      if (existingAlert) {
        existingAlert.remove();
      }
      
      // Create error alert
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-danger mt-4 contact-form-alert';
      alertDiv.role = 'alert';
      alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>Prišlo je do napake. Prosimo, poskusite ponovno.';
      
      // Insert alert before the form
      contactForm.parentNode.insertBefore(alertDiv, contactForm);
      
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        alertDiv.classList.add('fade');
        setTimeout(() => alertDiv.remove(), 500);
      }, 5000);
    }
  });