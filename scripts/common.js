const backendUrl = 'https://urbanfixbackend.vercel.app';
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

// Global variables
let imageDataUrl = null;
let mediaStream = null;
let currentFacingMode = 'environment';
let allComplaints = [];
let currentFilter = 'all';
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

// Profile functions
async function fetchProfile() {
  try {
    const response = await fetch(`${backendUrl}/profile`, {
      headers: { 'Authorization': token }
    });

    if (!response.ok) throw new Error('Failed to load profile');

    const data = await response.json();
    currentUserProfile = data;
    
    const displayName = data.display_name || 'User';
    nameElement.textContent = displayName;
    emailElement.textContent = data.email || 'No email provided';
    
    if (avatarElement) {
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
      body: JSON.stringify({
        display_name: displayName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    const updatedProfile = await response.json();
    currentUserProfile = updatedProfile;
    
    // Update UI
    nameElement.textContent = updatedProfile.display_name;
    avatarElement.textContent = updatedProfile.display_name[0].toUpperCase();
    
    showToast('Profile updated successfully');
    closeEditProfileModal();
  } catch (error) {
    console.error('Profile update error:', error);
    showToast('Failed to update profile', true);
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

    if (!response.ok) throw new Error('Failed to load complaints');

    const data = await response.json();
    
    totalComplaintsElement.textContent = data.complaints.length;
    totalUpvotesElement.textContent = data.complaints.reduce((total, complaint) => 
      total + (complaint.upvotes || 0), 0);

    if (data.complaints.length === 0) {
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
              ${complaint.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');
  } catch (error) {
    console.error('Complaints error:', error);
    
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timed out. Please try again.'
      : 'Failed to load complaints. Please try again later.';
      
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

// Camera functions
async function startCamera(facingMode = 'environment') {
  try {
    // Clean up existing stream first
    cleanupCamera();

    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    const cameraFeed = document.getElementById('cameraFeed');
    cameraFeed.srcObject = mediaStream;
    currentFacingMode = facingMode;

    // Only show toast when manually starting camera, not during initialization
    if (document.getElementById('cameraContainer').style.display === 'block') {
      showToast(`Camera started: ${facingMode === 'environment' ? 'Back' : 'Front'} camera`);
    }
    
    return true;
  } catch (error) {
    console.error('Camera error:', error);
    showToast(getCameraErrorMessage(error), true);
    return false;
  }
}

function cleanupCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      track.stop();
    });
    mediaStream = null;
  }

  const cameraFeed = document.getElementById('cameraFeed');
  if (cameraFeed) {
    cameraFeed.srcObject = null;
  }
}

function getCameraErrorMessage(error) {
  switch (error.name) {
    case 'NotFoundError':
      return 'No camera device found.';
    case 'NotAllowedError':
      return 'Camera permission denied.';
    case 'NotReadableError':
      return 'Camera is already in use.';
    case 'OverconstrainedError':
      return 'Camera does not support requested settings.';
    default:
      return `Camera error: ${error.message}`;
  }
}

// Image handling functions
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imageDataUrl = e.target.result;
      document.getElementById('imagePreview').src = imageDataUrl;
      showPreview();
    };
    reader.readAsDataURL(file);
  } else {
    alert('Please select an image file.');
  }
}

function showPreview() {
  document.getElementById('cameraContainer').style.display = 'none';
  document.getElementById('uploadContainer').style.display = 'none';
  document.getElementById('previewContainer').style.display = 'block';
}

function showUpload() {
  document.getElementById('cameraContainer').style.display = 'none';
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('uploadContainer').style.display = 'block';
}

// Popup functions
function showPopup() {
  document.getElementById('popup').style.display = 'flex';
  // Reset form
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  document.querySelectorAll('.tag-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Initialize image upload
  imageDataUrl = null;
  showUpload();
  initializeImageUpload();
}

function hidePopup() {
  document.getElementById('popup').style.display = 'none';
  cleanupCamera();
}

function initializeImageUpload() {
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const openCameraBtn = document.getElementById('openCameraBtn');
  const dropArea = document.getElementById('dropArea');
  const cameraContainer = document.getElementById('cameraContainer');
  const uploadContainer = document.getElementById('uploadContainer');
  const previewContainer = document.getElementById('previewContainer');
  const captureBtn = document.getElementById('captureBtn');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const cameraFeed = document.getElementById('cameraFeed');
  const switchCameraBtn = document.getElementById('switchCameraBtn');

  // File Upload Handlers
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and Drop Handlers
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  });

  // Camera Handlers
  openCameraBtn.addEventListener('click', async () => {
    const success = await startCamera('environment');
    if (success) {
      uploadContainer.style.display = 'none';
      cameraContainer.style.display = 'block';
    }
  });

  if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', async () => {
      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      await startCamera(newFacingMode);
    });
  }

  captureBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    canvas.getContext('2d').drawImage(cameraFeed, 0, 0);
    imageDataUrl = canvas.toDataURL('image/jpeg');
    document.getElementById('imagePreview').src = imageDataUrl;
    cleanupCamera();
    showPreview();
  });

  removeImageBtn.addEventListener('click', () => {
    imageDataUrl = null;
    showUpload();
  });

  retakeBtn.addEventListener('click', async () => {
    previewContainer.style.display = 'none';
    openCameraBtn.click();
  });
}

// Complaint functions
function getSelectedTags() {
  const checkboxes = document.querySelectorAll('.tag-checkbox input[type="checkbox"]');
  return Array.from(checkboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
}

async function fetchComplaints() {
  const complaintsFeed = document.getElementById('complaint-feed');
  if (!complaintsFeed) return;
  
  complaintsFeed.innerHTML = '<p>Loading complaints...</p>';

  try {
    const response = await fetch(`${backendUrl}/complaints`, {
      method: 'GET',
      headers: { 'Authorization': token }
    });

    if (!response.ok) {
      throw new Error('Failed to load complaints');
    }

    const data = await response.json();
    allComplaints = data.complaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filterComplaints(currentFilter);
  } catch (error) {
    if (complaintsFeed) {
      complaintsFeed.innerHTML = '<p>Failed to load complaints.</p>';
    }
  }
}

function filterComplaints(tag) {
  currentFilter = tag;

  // Update active filter button
  document.querySelectorAll('.filter-button').forEach(button => {
    button.classList.remove('active');
    if (button.textContent.toLowerCase().includes(tag.toLowerCase())) {
      button.classList.add('active');
    }
  });

  // Filter and display complaints
  const filteredComplaints = tag === 'all'
    ? allComplaints
    : allComplaints.filter(complaint => complaint.tags.includes(tag));

  displayComplaints(filteredComplaints);
}

function displayComplaints(complaints) {
  const complaintsFeed = document.getElementById('complaint-feed');
  if (!complaintsFeed) return;
  
  complaintsFeed.innerHTML = complaints.map(complaint => `
    <div class="complaint">
      <div class="complaint-content">
        <h3 class="complaint-title">${complaint.title}</h3>
        <p class="complaint-description">${complaint.description}</p>
        ${complaint.image_url ? `
          <div class="complaint-image">
            <img src="${complaint.image_url}" alt="Complaint image" 
                 class="complaint-img">
          </div>
        ` : ''}
        <div class="complaint-tags">
          ${(complaint.tags || []).map(tag => `
            <span class="tag">${tag}</span>
          `).join('')}
        </div>
      </div>
      <div class="upvote-container">
        <button class="upvote-btn" onclick="upvoteComplaint('${complaint.id}')">▲</button>
        <span id="upvotes-${complaint.id}">${complaint.upvotes || 0}</span>
      </div>
    </div>
  `).join('');
}

let isSubmitting = false; // Global flag

async function submitComplaint(event) {
  if (event) event.preventDefault();

  if (isSubmitting) return; // Prevent double call
  isSubmitting = true;

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const selectedTags = getSelectedTags();

  if (!title || !description) {
    alert('Title and description are required.');
    resetForm();
    return;
  }

  if (selectedTags.length === 0) {
    alert('Please select at least one category.');
    resetForm();
    return;
  }

  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('tags', JSON.stringify(selectedTags));

    if (imageDataUrl) {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      formData.append('image', blob, 'complaint-image.jpg');
    }

    const response = await fetch(`${backendUrl}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': token
      },
      body: formData
    });

    if (!response.ok) throw new Error('Submission failed');

    showToast('Complaint submitted successfully!');
    hidePopup();
    fetchComplaints();
  } catch (err) {
    console.error('Error submitting complaint:', err);
    showToast('Failed to submit complaint. Please try again.', true);
  } finally {
    resetForm();
  }

  function resetForm() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
    isSubmitting = false;
  }
}

async function upvoteComplaint(complaintId) {
  try {
    // Get the upvoted complaints from local storage
    let upvotedComplaints = JSON.parse(localStorage.getItem('upvotedComplaints')) || [];

    // Check if the user has already upvoted this complaint
    if (upvotedComplaints.includes(complaintId)) {
      showToast('You have already upvoted this complaint.', true);
      return;
    }

    const response = await fetch(`${backendUrl}/complaints/${complaintId}/upvote`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to upvote');
    }

    const updatedComplaint = await response.json();

    // Update the display
    document.getElementById(`upvotes-${complaintId}`).textContent = updatedComplaint.upvotes;

    // Store the upvote in local storage
    upvotedComplaints.push(complaintId);
    localStorage.setItem('upvotedComplaints', JSON.stringify(upvotedComplaints));

  } catch (error) {
    showToast('Failed to upvote complaint.', true);
  }
}

async function setSubmitLoading(isLoading) {
  const submitButton = document.querySelector('.popup-buttons button:first-child');
  if (submitButton) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Submitting...' : 'Submit';
  }
}

// CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
`;
document.head.appendChild(styleSheet);

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize complaint feed if on home page
  const complaintFeed = document.getElementById('complaint-feed');
  if (complaintFeed) {
    fetchComplaints();
  }
  
  // Initialize profile if on profile page
  const profileSection = document.getElementById('profile-section');
  if (profileSection) {
    fetchProfile();
    fetchUserComplaints();
  }
  
  // Set up event listeners
  
  // New complaint button
  const newComplaintButton = document.getElementById('new-complaint-btn');
  if (newComplaintButton) {
    newComplaintButton.addEventListener('click', showPopup);
  }
  
  // Popup cancel button
  const cancelButton = document.querySelector('.popup-buttons button:last-child');
  if (cancelButton) {
    cancelButton.addEventListener('click', hidePopup);
  }
  
  // Popup submit button
  const submitButton = document.querySelector('.popup-buttons button:first-child');
  if (submitButton) {
    submitButton.addEventListener('click', submitComplaint);
  }
  
  // Filter buttons
  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
      const tag = button.dataset.tag || 'all';
      filterComplaints(tag);
    });
    
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
  });
  
  // Logout button
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
  
  // Mobile nav toggle
  const menuIcon = document.querySelector('.menu-icon');
  if (menuIcon) {
    menuIcon.addEventListener('click', toggleNav);
  }
  
  // Camera support check
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const openCameraBtn = document.getElementById('openCameraBtn');
    if (openCameraBtn) {
      openCameraBtn.style.display = 'none';
    }
  }
  
  // Close popup when clicking outside
  const popup = document.getElementById('popup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target.id === 'popup') {
        hidePopup();
      }
    });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Close navigation on escape
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
      toggleNav();
    }
    
    const popup = document.getElementById('popup');
    if (popup && popup.style.display === 'flex') {
      hidePopup();
    }
  }
  
  // New complaint shortcut
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    showPopup();
  }
});

// Window resize handler
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
      toggleNav();
    }
    
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav && mobileNav.classList.contains('active')) {
      mobileNav.classList.remove('active');
    }
  }
});

// Clean up camera when page is hidden/closed
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cleanupCamera();
  }
});

window.addEventListener('beforeunload', () => {
  cleanupCamera();
});

// Document click handler
document.addEventListener('click', (e) => {
  // Mobile nav
  const mobileNav = document.getElementById('mobileNav');
  const menuIcon = document.querySelector('.menu-icon');
  
  if (mobileNav && mobileNav.classList.contains('active') &&
      !mobileNav.contains(e.target) &&
      menuIcon && !menuIcon.contains(e.target)) {
    mobileNav.classList.remove('active');
  }
  
  // Sidebar
  if (window.innerWidth <= 768) { 
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && 
        !e.target.closest('.menu-icon')) {
      toggleNav();
    }
  }
});

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

// Profile functions
async function fetchProfile() {
  try {
    const response = await fetch(`${backendUrl}/profile`, {
      headers: { 'Authorization': token }
    });

    if (!response.ok) throw new Error('Failed to load profile');

    const data = await response.json();
    currentUserProfile = data;
    
    const displayName = data.display_name || 'User';
    nameElement.textContent = displayName;
    emailElement.textContent = data.email || 'No email provided';
    
    if (avatarElement) {
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
      body: JSON.stringify({
        display_name: displayName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    const updatedProfile = await response.json();
    currentUserProfile = updatedProfile;
    
    // Update UI
    nameElement.textContent = updatedProfile.display_name;
    avatarElement.textContent = updatedProfile.display_name[0].toUpperCase();
    
    showToast('Profile updated successfully');
    closeEditProfileModal();
  } catch (error) {
    console.error('Profile update error:', error);
    showToast('Failed to update profile', true);
  } finally {
    saveProfileBtn.textContent = 'Save Changes';
    saveProfileBtn.disabled = false;
  }
}