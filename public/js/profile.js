/**
 * ===========================================
 * AF-Komik V2 - Profile Page JavaScript
 * ===========================================
 * 
 * Handles profile page functionality:
 * - Edit profile modal and form submission
 * - Change password modal and form submission
 * - Load and display user statistics
 * - Form validation and error handling
 */

console.log('[PROFILE] Profile page script loaded');

// ===========================================
// Modal Functions
// ===========================================

/**
 * Open edit profile modal
 */
function openEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  // Clear any previous messages
  hideMessage('editProfileError');
  hideMessage('editProfileSuccess');
  
  console.log('[PROFILE] Edit profile modal opened');
}

/**
 * Close edit profile modal
 */
function closeEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  
  // Reset form
  document.getElementById('editProfileForm').reset();
  
  console.log('[PROFILE] Edit profile modal closed');
}

/**
 * Open change password modal
 */
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  // Clear any previous messages
  hideMessage('changePasswordError');
  hideMessage('changePasswordSuccess');
  
  console.log('[PROFILE] Change password modal opened');
}

/**
 * Close change password modal
 */
function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  
  // Reset form
  document.getElementById('changePasswordForm').reset();
  
  console.log('[PROFILE] Change password modal closed');
}

/**
 * Close modal when clicking outside
 */
document.addEventListener('click', function(event) {
  const editModal = document.getElementById('editProfileModal');
  const passwordModal = document.getElementById('changePasswordModal');
  
  if (event.target === editModal) {
    closeEditProfileModal();
  }
  
  if (event.target === passwordModal) {
    closeChangePasswordModal();
  }
});

/**
 * Close modal with Escape key
 */
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeEditProfileModal();
    closeChangePasswordModal();
  }
});

// ===========================================
// Form Handling
// ===========================================

/**
 * Handle edit profile form submission
 */
document.getElementById('editProfileForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  console.log('[PROFILE] Submitting profile update...');
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector('.button-text');
  const buttonLoader = submitButton.querySelector('.button-loader');
  
  // Get form data
  const formData = new FormData(form);
  const data = {
    username: formData.get('username'),
    email: formData.get('email'),
    displayName: formData.get('displayName') || null
  };
  
  // Show loading state
  submitButton.disabled = true;
  buttonText.classList.add('hidden');
  buttonLoader.classList.remove('hidden');
  hideMessage('editProfileError');
  hideMessage('editProfileSuccess');
  
  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('[PROFILE] ✓ Profile updated successfully');
      showMessage('editProfileSuccess', result.message || 'Profil berhasil diperbarui!');
      
      // Reload page after 1.5 seconds to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } else {
      console.log('[PROFILE] ✗ Profile update failed:', result.message);
      
      // Handle field-specific errors
      if (result.data && typeof result.data === 'object') {
        const errorMessages = Object.values(result.data).filter(msg => msg);
        showMessage('editProfileError', errorMessages.join(', ') || result.message);
      } else {
        showMessage('editProfileError', result.message || 'Gagal memperbarui profil');
      }
    }
    
  } catch (error) {
    console.error('[PROFILE] ✗ Profile update error:', error);
    showMessage('editProfileError', 'Terjadi kesalahan. Silakan coba lagi.');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    buttonText.classList.remove('hidden');
    buttonLoader.classList.add('hidden');
  }
});

/**
 * Handle change password form submission
 */
document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  console.log('[PROFILE] Submitting password change...');
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector('.button-text');
  const buttonLoader = submitButton.querySelector('.button-loader');
  
  // Get form data
  const formData = new FormData(form);
  const data = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword')
  };
  
  // Client-side validation
  if (data.newPassword !== data.confirmPassword) {
    showMessage('changePasswordError', 'Password baru tidak cocok');
    return;
  }
  
  if (data.newPassword.length < 8) {
    showMessage('changePasswordError', 'Password baru harus minimal 8 karakter');
    return;
  }
  
  // Show loading state
  submitButton.disabled = true;
  buttonText.classList.add('hidden');
  buttonLoader.classList.remove('hidden');
  hideMessage('changePasswordError');
  hideMessage('changePasswordSuccess');
  
  try {
    const response = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('[PROFILE] ✓ Password changed successfully');
      showMessage('changePasswordSuccess', result.message || 'Password berhasil diubah!');
      
      // Clear form and close modal after 2 seconds
      setTimeout(() => {
        form.reset();
        closeChangePasswordModal();
      }, 2000);
      
    } else {
      console.log('[PROFILE] ✗ Password change failed:', result.message);
      
      // Handle field-specific errors
      if (result.data && typeof result.data === 'object') {
        const errorMessages = Object.values(result.data).filter(msg => msg);
        showMessage('changePasswordError', errorMessages.join(', ') || result.message);
      } else {
        showMessage('changePasswordError', result.message || 'Gagal mengubah password');
      }
    }
    
  } catch (error) {
    console.error('[PROFILE] ✗ Password change error:', error);
    showMessage('changePasswordError', 'Terjadi kesalahan. Silakan coba lagi.');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    buttonText.classList.remove('hidden');
    buttonLoader.classList.add('hidden');
  }
});

// ===========================================
// Statistics Loading
// ===========================================

/**
 * Load and display user statistics
 */
async function loadUserStats() {
  console.log('[PROFILE] Loading user statistics...');
  
  try {
    const response = await fetch('/api/auth/stats');
    const result = await response.json();
    
    if (result.status === 'success' && result.data && result.data.stats) {
      const stats = result.data.stats;
      
      // Update UI
      document.getElementById('stats-comics').textContent = stats.comicsRead || 0;
      document.getElementById('stats-chapters').textContent = stats.chaptersRead || 0;
      document.getElementById('stats-bookmarks').textContent = stats.bookmarks || 0;
      
      console.log('[PROFILE] ✓ Stats loaded:', stats);
    } else {
      console.log('[PROFILE] ✗ Failed to load stats:', result.message);
      // Keep default "-" values
    }
    
  } catch (error) {
    console.error('[PROFILE] ✗ Error loading stats:', error);
    // Keep default "-" values
  }
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Show error or success message
 * 
 * @param {string} elementId - ID of message container
 * @param {string} message - Message to display
 */
function showMessage(elementId, message) {
  const element = document.getElementById(elementId);
  const messageText = element.querySelector('p');
  
  messageText.textContent = message;
  element.classList.remove('hidden');
}

/**
 * Hide error or success message
 * 
 * @param {string} elementId - ID of message container
 */
function hideMessage(elementId) {
  const element = document.getElementById(elementId);
  element.classList.add('hidden');
}

// ===========================================
// Initialize on Page Load
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('[PROFILE] Initializing profile page...');
  
  // Load user statistics
  loadUserStats();
  
  console.log('[PROFILE] ✓ Profile page initialized');
});
