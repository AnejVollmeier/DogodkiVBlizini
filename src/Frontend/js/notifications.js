/**
 * Display notification to the user in top-right corner
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // First check if notifications container exists, create it if it doesn't
    let notificationsContainer = document.getElementById('notifications-container');
    
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications-container';
        notificationsContainer.className = 'notifications-container';
        notificationsContainer.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
        `;
        document.body.appendChild(notificationsContainer);
    }
    
    // Create notification element
    const notificationElement = document.createElement('div');
    notificationElement.className = `alert ${getAlertTypeClass(type)} alert-dismissible fade show`;
    notificationElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    notificationsContainer.appendChild(notificationElement);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        notificationElement.classList.remove('show');
        setTimeout(() => {
            notificationElement.remove();
        }, 150);
    }, 2000);
}

/**
 * Get Bootstrap alert class based on notification type
 * @param {string} type - Notification type
 * @returns {string} - Bootstrap alert class
 */
function getAlertTypeClass(type) {
    switch (type) {
        case 'success':
            return 'alert-success';
        case 'error':
            return 'alert-danger';
        case 'warning':
            return 'alert-warning';
        case 'info':
        default:
            return 'alert-info';
    }
}

// Make functions available globally
window.showNotification = showNotification;
window.getAlertTypeClass = getAlertTypeClass;
