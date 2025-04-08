// Profile page JavaScript
const backendUrl = 'https://urbanfixbackend.vercel.app'; // Update with your backend URL
const token = localStorage.getItem('token');

// Redirect if not logged in
if (!token) {
  window.location.href = 'login.html';
}

// DOM Elements
const nameElement = document.getElementById('name');
const emailElement = document.getElementById('email');
const avatarElement = document.getElementById('avatar');
const totalComplaintsElement = document.getElementById('total-complaints');
const totalUpvotesElement = document.getElementById('total-upvotes');
const complaintsList = document.getElementById('complaints-list');
const sidebar = document.getElementById('sidebar');
const navOverlay = document.getElementById('navOverlay');
const editProfileBtn = document.getElementById('edit-profile-btn');
const editProfileModal = document.getElementById('edit-profile-modal');
const closeEditProfileBtn = document.getElementById('close-edit-profile');
const displayNameInput = document.getElementById('display-name'); // Fixed ID
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');

// Global variables
let currentUserProfile = null;
let toastTimeout = null;

// Error handling
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  if (complaintsList) {
    complaintsList.innerHTML = '';
    complaintsList.appendChild(errorDiv);
  }
}

// Toast notification function
function showToast(message, isError = false) {
  // Clear any existing toast timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  const container = document.getElementById('toastContainer') || createToastContainer();
  
  // Remove existing toasts
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  
  container.appendChild(toast);

  // Remove toast after animation
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
  `;
  document.body.appendChild(container);
  return container;
}



async function fetchProfile() {
  try {
    const response = await fetch(`${backendUrl}/profile`, {
      headers: { 'Authorization': token }
    });

    if (!response.ok) throw new Error('Failed to load profile');

    const data = await response.json();
    currentUserProfile = data;

    const profile = data.profile;

    const displayName = profile.display_name || 'User';
    nameElement.textContent = displayName;
    emailElement.textContent = profile.email || 'No email provided';

    if (avatarElement && displayName) {
      avatarElement.textContent = displayName[0].toUpperCase();
    }

    return data;
  } catch (error) {
    console.error('Profile error:', error);
    showError('Failed to load profile');

    if (nameElement) {
      nameElement.textContent = 'Failed to load profile';
    }

    throw error;
  }
}

// Edit profile functions
function openEditProfileModal() {
  if (currentUserProfile) {
    displayNameInput.value = currentUserProfile.display_name || '';
  }
  
  editProfileModal.style.display = 'flex';
}

function closeEditProfileModal() {
  editProfileModal.style.display = 'none';
}

async function saveProfileChanges() {
  const displayName = displayNameInput.value.trim();

  if (!displayName) {
    showToast('Display name cannot be empty', true);
    return;
  }

  try {
    saveProfileBtn.textContent = 'Saving...';
    saveProfileBtn.disabled = true;

    const response = await fetch(`${backendUrl}/profile/update`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ display_name: displayName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }

    const updatedProfile = await response.json();
    console.log('Received profile update response:', updatedProfile);

    if (!updatedProfile || !updatedProfile.display_name) {
      throw new Error('Invalid response from server');
    }

    currentUserProfile = updatedProfile;

    // Update UI
    nameElement.textContent = updatedProfile.display_name;
    if (avatarElement) {
      avatarElement.textContent = updatedProfile.display_name[0].toUpperCase();
    }

    showToast('Profile updated successfully');
    closeEditProfileModal();
  } catch (error) {
    console.error('Profile update error:', error);
    showToast(error.message || 'Failed to update profile', true);
  } finally {
    saveProfileBtn.textContent = 'Save Changes';
    saveProfileBtn.disabled = false;
  }
}

// User complaints functions
async function fetchUserComplaints() {
  try {
    complaintsList.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
      </div>
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${backendUrl}/complaints`, {
      headers: { 'Authorization': token },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to load complaints');
    }

    const data = await response.json();
    
    totalComplaintsElement.textContent = data.complaints?.length || 0;
    totalUpvotesElement.textContent = data.complaints?.reduce((total, complaint) => 
      total + (complaint.upvotes || 0), 0) || 0;

    if (!data.complaints || data.complaints.length === 0) {
      complaintsList.innerHTML = `
        <div class="error-message" style="color: var(--text-secondary);">
          You haven't submitted any complaints yet.
        </div>
      `;
      return;
    }

    complaintsList.innerHTML = data.complaints
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(complaint => `
        <div class="complaint-card">
          <h3 class="complaint-title">${complaint.title}</h3>
          <div class="complaint-meta">
            <span>${new Date(complaint.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}</span>
            <span>👍 ${complaint.upvotes || 0}</span>
          </div>
          <p class="complaint-description">${complaint.description}</p>
          ${complaint.tags ? `
            <div class="complaint-tags">
              ${Array.isArray(complaint.tags) ? complaint.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
          ` : ''}
        </div>
      `).join('');
  } catch (error) {
    console.error('Complaints error:', error);
    
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timed out. Please try again.'
      : error.message || 'Failed to load complaints. Please try again later.';
      
    complaintsList.innerHTML = `
      <div class="error-message">
        <p>${errorMessage}</p>
        <button 
          onclick="fetchUserComplaints()"
          style="
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background-color 0.2s ease;
          "
          onmouseover="this.style.backgroundColor = 'var(--primary-hover)'"
          onmouseout="this.style.backgroundColor = 'var(--primary-color)'"
        >
          Retry
        </button>
      </div>
    `;
  }
}

// Navigation functions
function toggleNav() {
  sidebar.classList.toggle('active');
  navOverlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// Initialize event listeners for profile page
document.addEventListener('DOMContentLoaded', () => {
  // Initialize profile data
  fetchProfile().catch(error => {
    console.error('Failed to load profile:', error);
  });
  
  fetchUserComplaints().catch(error => {
    console.error('Failed to load complaints:', error);
  });
  
  // Set up event listeners for profile editing
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openEditProfileModal);
  }
  
  if (closeEditProfileBtn) {
    closeEditProfileBtn.addEventListener('click', closeEditProfileModal);
  }
  
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfileChanges);
  }
  
  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener('click', closeEditProfileModal);
  }
  
  // Close modal when clicking outside
  if (editProfileModal) {
    editProfileModal.addEventListener('click', (e) => {
      if (e.target === editProfileModal) {
        closeEditProfileModal();
      }
    });
  }
  
  // Keyboard shortcuts for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editProfileModal.style.display === 'flex') {
      closeEditProfileModal();
    }
  });
});