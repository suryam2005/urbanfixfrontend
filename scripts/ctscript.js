// Get common JS variables
const backendUrl = 'https://urbanfixbackend.vercel.app';
const token = localStorage.getItem('token');

// DOM Elements
const complaintsContainer = document.getElementById('complaints-container');
const loadingContainer = document.getElementById('loading-container');
const tagContainer = document.getElementById('tag-container');
const searchInput = document.getElementById('search-input');
const totalCountEl = document.getElementById('total-count');
const pendingCountEl = document.getElementById('pending-count');
const workingCountEl = document.getElementById('working-count');
const finishedCountEl = document.getElementById('finished-count');

// Modal Elements
const complaintModal = document.getElementById('complaint-modal');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalTags = document.getElementById('modal-tags');
const modalImage = document.getElementById('modal-image');
const imageContainer = document.getElementById('image-container');
const modalUser = document.getElementById('modal-user');
const modalDate = document.getElementById('modal-date');
const closeModalBtn = document.getElementById('close-modal');
const sliderProgress = document.getElementById('slider-progress');
const steps = document.querySelectorAll('.step');
const commentsContainer = document.getElementById('comments-container');

// App State
let complaints = [];
let filteredComplaints = [];
let currentUser = null;
let currentUserId = null;
let currentComplaint = null;
let currentFilter = 'all';
let activeTagFilter = null;
let allTags = [];

// Check for authentication
if (!token) {
  window.location.href = 'login.html';
}

// Initialize the app
function init() {
  setupEventListeners();
  fetchUserProfile();
}

// Fetch user profile
async function fetchUserProfile() {
  try {
    const response = await fetch(`${backendUrl}/profile`, {
      headers: {
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    const profile = await response.json();
    currentUser = {
      id: profile.id,
      name: profile.display_name || profile.name || 'User',
      email: profile.email
    };
    
    // Save user ID for fetching user-specific complaints
    currentUserId = profile.id;
    
    // Update profile elements
    const userNameElement = document.getElementById('user-name');
    const userInitialElement = document.getElementById('user-initial');
    
    if (userNameElement) userNameElement.textContent = currentUser.name;
    if (userInitialElement) userInitialElement.textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Now fetch complaints by user ID
    fetchUserComplaints(currentUserId);
    
  } catch (error) {
    console.error('Profile error:', error);
    showToast('Failed to load profile', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Navigation filter events
  document.querySelectorAll('.nav-menu li').forEach(item => {
    if (item.hasAttribute('data-filter')) {
      item.addEventListener('click', () => {
        const filter = item.getAttribute('data-filter');
        document.querySelectorAll('.nav-menu li').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        currentFilter = filter;
        filterComplaints();
      });
    }
  });

  // Search input event
  if (searchInput) {
    searchInput.addEventListener('input', filterComplaints);
  }

  // Modal events
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
  }
  
  // Status slider events
  if (steps) {
    steps.forEach(step => {
      step.addEventListener('click', () => updateStatus(step));
    });
  }
  
  // Save changes button
  const saveStatusBtn = document.getElementById('save-status');
  if (saveStatusBtn) {
    saveStatusBtn.addEventListener('click', saveStatusChanges);
  }
  
  // Add comment button
  const addCommentBtn = document.getElementById('add-comment-btn');
  if (addCommentBtn) {
    addCommentBtn.addEventListener('click', addComment);
  }
  
  // Delete complaint button
  const deleteComplaintBtn = document.getElementById('delete-complaint');
  if (deleteComplaintBtn) {
    deleteComplaintBtn.addEventListener('click', deleteComplaint);
  }
  
  // Close modal when clicking outside
  if (complaintModal) {
    window.addEventListener('click', (e) => {
      if (e.target === complaintModal) {
        hideModal();
      }
    });
  }
}

// Fetch complaints for specific user
async function fetchUserComplaints(userId) {
  try {
    if (loadingContainer) {
      loadingContainer.style.display = 'flex';
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Use a specific endpoint for user complaints
    const response = await fetch(`${backendUrl}/complaints/user/${userId}`, {
      headers: {
        'Authorization': token
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch complaints');
    }
    
    const data = await response.json();
    complaints = data.complaints || [];
    
    // Update stats
    updateStats();
    
    // Extract all unique tags
    extractTags();
    
    // Initial filtering
    filterComplaints();
    
    // Hide loading
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Fetch complaints error:', error);
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }
    
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timed out. Please try again.'
      : 'Failed to load complaints. Please try again later.';
      
    complaintsContainer.innerHTML = `
      <div class="error-message">
        <p>${errorMessage}</p>
        <button onclick="fetchUserComplaints('${currentUserId}')" class="retry-btn">
          Retry
        </button>
      </div>
    `;
  }
}

// Extract unique tags from all complaints
function extractTags() {
  allTags = [];
  
  complaints.forEach(complaint => {
    if (complaint.tags && Array.isArray(complaint.tags)) {
      complaint.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
        }
      });
    }
  });
  
  // Render tags in sidebar
  renderTagFilters();
}

// Render tag filters in sidebar
function renderTagFilters() {
  if (!tagContainer) return;
  
  tagContainer.innerHTML = '';
  
  allTags.forEach(tag => {
    const tagEl = document.createElement('div');
    tagEl.className = 'tag-filter-item';
    if (tag === activeTagFilter) {
      tagEl.classList.add('active');
    }
    tagEl.textContent = tag;
    tagEl.addEventListener('click', () => {
      // Toggle tag filter
      if (activeTagFilter === tag) {
        activeTagFilter = null;
        tagEl.classList.remove('active');
      } else {
        document.querySelectorAll('.tag-filter-item').forEach(t => t.classList.remove('active'));
        activeTagFilter = tag;
        tagEl.classList.add('active');
      }
      filterComplaints();
    });
    tagContainer.appendChild(tagEl);
  });
}

// Filter complaints based on current filter, search, and tag
function filterComplaints() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  
  filteredComplaints = complaints.filter(complaint => {
    // Filter by status
    if (currentFilter !== 'all' && complaint.status !== currentFilter) {
      return false;
    }
    
    // Filter by tag
    if (activeTagFilter && (!complaint.tags || !complaint.tags.includes(activeTagFilter))) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && 
      !complaint.title.toLowerCase().includes(searchTerm) && 
      !complaint.description.toLowerCase().includes(searchTerm) && 
      !(complaint.tags && complaint.tags.some(tag => tag.toLowerCase().includes(searchTerm)))) {
      return false;
    }
    
    return true;
  });
  
  renderComplaints();
}

// Render complaints with the new vertical progress tracker design
function renderComplaints() {
  if (!complaintsContainer) return;
  
  if (filteredComplaints.length === 0) {
    complaintsContainer.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <p>No complaints found. Adjust your filters or try again later.</p>
      </div>
    `;
    return;
  }
  
  complaintsContainer.innerHTML = filteredComplaints
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(complaint => {
      // Determine which steps are completed
      const statuses = ['submitted', 'working', 'finished'];
      const currentStatusIndex = statuses.indexOf(complaint.status);
      
      return `
        <div class="complaint-card glass-panel" onclick="openComplaintModal('${complaint.id}')">
          <div class="complaint-content">
            <h3 class="complaint-title">${complaint.title}</h3>
            <p class="complaint-desc">${complaint.description}</p>
            
            ${complaint.tags && complaint.tags.length > 0 ? `
              <div class="complaint-tags">
                ${complaint.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="progress-tracker">
            <div class="progress-line">
              <div class="progress-fill" style="height: ${getProgressPercentage(complaint.status)}%"></div>
            </div>
            <div class="progress-steps">
              <div class="progress-step ${currentStatusIndex >= 0 ? 'completed' : ''}">
                <div class="step-dot"></div>
                <span>Submitted</span>
              </div>
              <div class="progress-step ${currentStatusIndex >= 1 ? 'completed' : ''}">
                <div class="step-dot"></div>
                <span>In Progress</span>
              </div>
              <div class="progress-step ${currentStatusIndex >= 2 ? 'completed' : ''}">
                <div class="step-dot"></div>
                <span>Resolved</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
}

// Get progress percentage based on status
function getProgressPercentage(status) {
  switch(status) {
    case 'submitted': return 0;
    case 'working': return 50;
    case 'finished': return 100;
    default: return 0;
  }
}

// Update dashboard stats
function updateStats() {
  if (!complaints.length) return;
  
  if (totalCountEl) totalCountEl.textContent = complaints.length;
  
  const pendingCount = complaints.filter(c => c.status === 'pending' || c.status === 'submitted').length;
  const workingCount = complaints.filter(c => c.status === 'working').length;
  const finishedCount = complaints.filter(c => c.status === 'finished').length;
  
  if (pendingCountEl) pendingCountEl.textContent = pendingCount;
  if (workingCountEl) workingCountEl.textContent = workingCount;
  if (finishedCountEl) finishedCountEl.textContent = finishedCount;
}

// Open complaint detail modal
function openComplaintModal(id) {
  if (!complaintModal) return;
  
  currentComplaint = complaints.find(c => c.id === id);
  if (!currentComplaint) return;
  
  // Set modal content
  modalTitle.textContent = currentComplaint.title;
  modalDescription.textContent = currentComplaint.description;
  
  if (modalUser) {
    modalUser.textContent = currentUser ? currentUser.name : 'You';
  }
  
  if (modalDate) {
    modalDate.textContent = formatDate(currentComplaint.created_at);
  }
  
  // Set tags
  if (modalTags) {
    modalTags.innerHTML = '';
    if (currentComplaint.tags && currentComplaint.tags.length > 0) {
      currentComplaint.tags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'modal-tag';
        tagEl.textContent = tag;
        modalTags.appendChild(tagEl);
      });
    } else {
      modalTags.innerHTML = '<p>No tags</p>';
    }
  }
  
  // Set image if exists
  if (imageContainer && modalImage) {
    if (currentComplaint.image_url) {
      modalImage.src = currentComplaint.image_url;
      imageContainer.style.display = 'block';
    } else {
      imageContainer.style.display = 'none';
    }
  }
  
  // Set status slider
  if (sliderProgress && steps) {
    updateStatusSlider(currentComplaint.status);
  }
  
  // Render comments
  if (commentsContainer) {
    renderComments(currentComplaint.admin_comments || []);
  }
  
  // Show modal
  complaintModal.classList.add('active');
}

// Hide complaint modal
function hideModal() {
  if (complaintModal) {
    complaintModal.classList.remove('active');
    currentComplaint = null;
  }
}

// Update status in modal when clicking on steps
function updateStatus(step) {
  if (!step) return;
  
  const newStatus = step.getAttribute('data-status');
  
  // Update UI
  steps.forEach(s => s.classList.remove('active'));
  step.classList.add('active');
  
  // Update slider progress
  updateStatusSlider(newStatus);
}

// Update status slider based on selected status
function updateStatusSlider(status) {
  if (!sliderProgress || !steps) return;
  
  // Reset all steps
  steps.forEach(step => step.classList.remove('active'));
  
  // Set progress width and active step based on status
  switch(status) {
    case 'pending':
    case 'submitted':
      sliderProgress.style.width = '0%';
      steps[0].classList.add('active');
      break;
    case 'working':
      sliderProgress.style.width = '50%';
      steps[1].classList.add('active');
      break;
    case 'finished':
      sliderProgress.style.width = '100%';
      steps[2].classList.add('active');
      break;
  }
}

// Save status changes
async function saveStatusChanges() {
  if (!currentComplaint) return;
  
  const activeStep = document.querySelector('.step.active');
  if (!activeStep) return;
  
  const newStatus = activeStep.getAttribute('data-status');
  
  try {
    const response = await fetch(`${backendUrl}/complaints/${currentComplaint.id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    
    // Update local state
    currentComplaint.status = newStatus;
    const index = complaints.findIndex(c => c.id === currentComplaint.id);
    if (index !== -1) {
      complaints[index].status = newStatus;
    }
    
    // Re-render
    filterComplaints();
    updateStats();
    
    showToast('Status updated successfully', 'success');
    
  } catch (error) {
    console.error('Update status error:', error);
    showToast('Failed to update status', 'error');
  }
}

// Add comment
async function addComment() {
  if (!currentComplaint) return;
  
  const commentInput = document.getElementById('comment-input');
  if (!commentInput || !commentInput.value.trim()) return;
  
  const commentText = commentInput.value.trim();
  
  try {
    const response = await fetch(`${backendUrl}/complaints/${currentComplaint.id}/comment`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: commentText })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add comment');
    }
    
    const result = await response.json();
    
    // Update local state
    if (!currentComplaint.admin_comments) {
      currentComplaint.admin_comments = [];
    }
    
    currentComplaint.admin_comments.push({
      text: commentText,
      timestamp: new Date().toISOString()
    });
    
    // Update comments in modal
    renderComments(currentComplaint.admin_comments);
    
    // Clear input
    commentInput.value = '';
    
    showToast('Comment added successfully', 'success');
    
  } catch (error) {
    console.error('Add comment error:', error);
    showToast('Failed to add comment', 'error');
  }
}

// Delete complaint
async function deleteComplaint() {
  if (!currentComplaint) return;
  
  if (!confirm('Are you sure you want to delete this complaint?')) {
    return;
  }
  
  try {
    const response = await fetch(`${backendUrl}/complaints/${currentComplaint.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete complaint');
    }
    
    // Remove from local state
    complaints = complaints.filter(c => c.id !== currentComplaint.id);
    
    // Hide modal
    hideModal();
    
    // Re-render
    filterComplaints();
    updateStats();
    
    showToast('Complaint deleted successfully', 'success');
    
  } catch (error) {
    console.error('Delete complaint error:', error);
    showToast('Failed to delete complaint', 'error');
  }
}

// Render comments in modal
function renderComments(comments) {
  if (!commentsContainer) return;
  
  commentsContainer.innerHTML = '';
  
  if (!comments || comments.length === 0) {
    commentsContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
    return;
  }
  
  comments.forEach(comment => {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.innerHTML = `
      <div class="comment-header">
        <div class="comment-user">Administrator</div>
        <div class="comment-timestamp">${formatDate(comment.timestamp)}</div>
      </div>
      <div class="comment-text">${comment.text}</div>
    `;
    commentsContainer.appendChild(commentEl);
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) return;
  
  // Set message and type
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  
  // Show toast
  toast.classList.add('show');
  
  // Hide after delay
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);