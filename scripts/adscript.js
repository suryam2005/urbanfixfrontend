// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Login Elements
    const loginContainer = document.getElementById('login-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Dashboard Elements
    const dashboardContainer = document.getElementById('dashboard-container');
    const adminName = document.getElementById('admin-name');
    const logoutBtn = document.getElementById('logout-btn');
    const searchInput = document.getElementById('search-input');
    
    // Navigation Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const overviewPage = document.getElementById('overview-page');
    const complaintsPage = document.getElementById('complaints-page');
    const settingsPage = document.getElementById('settings-page');
    
    // Overview Page Elements
    const totalComplaintsElement = document.getElementById('total-complaints');
    const pendingComplaintsElement = document.getElementById('pending-complaints');
    const workingComplaintsElement = document.getElementById('working-complaints');
    const finishedComplaintsElement = document.getElementById('finished-complaints');
    const recentComplaintsTable = document.getElementById('recent-complaints-table').querySelector('tbody');
    const categoriesChart = document.getElementById('categories-chart');
    const statusChart = document.getElementById('status-chart');
    
    // Complaints Page Elements
    const complaintsTable = document.getElementById('complaints-table').querySelector('tbody');
    const complaintCount = document.getElementById('complaint-count');
    const statusFilter = document.getElementById('status-filter');
    const tagFilter = document.getElementById('tag-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageIndicator = document.getElementById('page-indicator');
    
    // Settings Page Elements
    const accountForm = document.getElementById('account-form');
    const displayNameInput = document.getElementById('display-name');
    const emailSettingsInput = document.getElementById('email-settings');
    const passwordForm = document.getElementById('password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    // Modal Elements
    const complaintModal = document.getElementById('complaint-modal');
    const modalTitle = document.getElementById('modal-title');
    const detailId = document.getElementById('detail-id');
    const detailTitle = document.getElementById('detail-title');
    const detailDescription = document.getElementById('detail-description');
    const detailStatus = document.getElementById('detail-status');
    const updateStatusBtn = document.getElementById('update-status');
    const detailTags = document.getElementById('detail-tags');
    const detailCreated = document.getElementById('detail-created');
    const detailUpvotes = document.getElementById('detail-upvotes');
    const detailImage = document.getElementById('detail-image');
    const imageContainer = document.getElementById('image-container');
    const commentsList = document.getElementById('comments-list');
    const commentText = document.getElementById('comment-text');
    const addCommentBtn = document.getElementById('add-comment');
    const deleteComplaintBtn = document.getElementById('delete-complaint');
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-btn');
    
    // Confirmation Dialog Elements
    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes');
    const confirmNoBtn = document.getElementById('confirm-no');
    
    // Toast Elements
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');
    
    // Backend API URL
    const API_URL = 'https://urbanfixbackend.vercel.app'; // Change to your actual backend URL
    
    // State Management
    let currentPage = 'overview';
    let complaintsData = [];
    let filteredComplaints = [];
    let currentComplaintId = null;
    let currentComplaintIndex = -1;
    let currentPage_complaints = 1;
    const pageSize = 5;
    let confirmCallback = null;
    let authToken = null;
    
    // Login functionality
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Successful login
                authToken = data.token;
                
                // Store token in session storage
                sessionStorage.setItem('adminToken', authToken);
                sessionStorage.setItem('adminEmail', email);
                
                // Show dashboard
                loginContainer.classList.add('hidden');
                dashboardContainer.classList.remove('hidden');
                
                // Fetch admin profile and load dashboard
                fetchAdminProfile();
                loadDashboardData();
                
                showToast('success', 'Login successful!');
            } else {
                // Failed login
                loginError.textContent = data.message || 'Invalid email or password';
                passwordInput.value = '';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Error connecting to server. Please try again.';
        }
    });
    
    async function fetchAdminProfile() {
        try {
            const response = await fetch(`${API_URL}/admin/profile`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) throw new Error('Failed to fetch admin profile');
    
            const data = await response.json();
    
            console.log("Admin Profile:", data); // Debugging line
    
            adminName.textContent = data.display_name || data.email;
        } catch (error) {
            console.error('Error fetching admin profile:', error);
        }
    }
    
    // Check if admin is already logged in
    function checkLoginStatus() {
        const token = sessionStorage.getItem('adminToken');
        if (token) {
            authToken = token;
            loginContainer.classList.add('hidden');
            dashboardContainer.classList.remove('hidden');
            fetchAdminProfile();
            loadDashboardData();
        }
    }
    
    // Logout functionality
    logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminEmail');
        authToken = null;
        dashboardContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        loginError.textContent = '';
        emailInput.value = '';
        passwordInput.value = '';
    });
    
    // Navigation functionality
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = this.getAttribute('data-page');
            if (targetPage) {
                navigateTo(targetPage);
            }
        });
    });
    
    function navigateTo(page) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            }
        });
        
        // Hide all pages
        document.querySelectorAll('.dashboard-page').forEach(p => {
            p.classList.add('hidden');
        });
        
        // Show target page
        document.getElementById(page + '-page').classList.remove('hidden');
        
        currentPage = page;
        
        // Load page-specific data
        if (page === 'overview') {
            loadOverviewData();
        } else if (page === 'complaints') {
            loadComplaintsData();
        } else if (page === 'settings') {
            loadSettingsData();
        }
    }
    
    // Dashboard Data Loading
    function loadDashboardData() {
        loadOverviewData();
        
        // Pre-load settings data
        const email = sessionStorage.getItem('adminEmail');
        if (email) {
            emailSettingsInput.value = email;
            displayNameInput.value = email.split('@')[0];
        }
    }
    
    // Load overview data from backend
    async function loadOverviewData() {
        try {
            const authToken = sessionStorage.getItem('adminToken');
    
            const response = await fetch(`${API_URL}/admin/statistics`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch statistics');
            
            const data = await response.json();
            
            // Update stats display
            totalComplaintsElement.textContent = data.total || 0;
            pendingComplaintsElement.textContent = data.byStatus.pending || 0;
            workingComplaintsElement.textContent = data.byStatus.working || 0;
            finishedComplaintsElement.textContent = data.byStatus.finished || 0;
            
            // Store all complaints data
            complaintsData = data.recent || [];
            
            // Load recent complaints
            loadRecentComplaints(data.recent || []);
            
            // Load charts
            renderCategoryChart(data.byTag || {});
            renderStatusChart(data.byStatus || {});
            
        } catch (error) {
            console.error('Error loading overview data:', error);
            showToast('error', 'Failed to load dashboard data');
        }
    }
    
    // Load recent complaints table
    function loadRecentComplaints(complaints) {
        recentComplaintsTable.innerHTML = '';
        
        if (complaints.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="text-center">No complaints found</td>
            `;
            recentComplaintsTable.appendChild(row);
            return;
        }
        
        complaints.forEach(complaint => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${complaint.id}</td>
                <td>${complaint.title}</td>
                <td><span class="status-badge ${complaint.status}">${complaint.status}</span></td>
                <td>${formatDate(complaint.created_at)}</td>
                <td>
                    <button class="btn-icon view-complaint" data-id="${complaint.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            recentComplaintsTable.appendChild(row);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-complaint').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                openComplaintDetail(id);
            });
        });
    }
    
    // Render category distribution chart
    function renderCategoryChart(categoryData) {
        categoriesChart.innerHTML = '';
        
        if (Object.keys(categoryData).length === 0) {
            categoriesChart.innerHTML = '<p class="chart-empty">No category data available</p>';
            return;
        }
        
        // Create simple bar chart
        const maxValue = Math.max(...Object.values(categoryData));
        
        Object.keys(categoryData).forEach(category => {
            const count = categoryData[category];
            const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
            
            const barContainer = document.createElement('div');
            barContainer.className = 'chart-bar-container';
            
            const label = document.createElement('div');
            label.className = 'chart-label';
            label.textContent = formatCategoryName(category);
            
            const barWrapper = document.createElement('div');
            barWrapper.className = 'chart-bar-wrapper';
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.width = `${percentage}%`;
            bar.style.backgroundColor = getColorForCategory(category);
            
            const value = document.createElement('div');
            value.className = 'chart-value';
            value.textContent = count;
            
            barWrapper.appendChild(bar);
            barWrapper.appendChild(value);
            barContainer.appendChild(label);
            barContainer.appendChild(barWrapper);
            categoriesChart.appendChild(barContainer);
        });
    }
    
    // Format category name for display
    function formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    // Render status distribution chart
    function renderStatusChart(statusData) {
        statusChart.innerHTML = '';
        
        if (Object.keys(statusData).length === 0) {
            statusChart.innerHTML = '<p class="chart-empty">No status data available</p>';
            return;
        }
        
        // Create pie chart (simplified with colored blocks)
        const total = Object.values(statusData).reduce((sum, count) => sum + count, 0);
        
        if (total === 0) {
            statusChart.innerHTML = '<p class="chart-empty">No status data available</p>';
            return;
        }
        
        const statusChartContainer = document.createElement('div');
        statusChartContainer.className = 'status-chart-container';
        
        // Statuses to display
        const statuses = ['pending', 'working', 'finished'];
        
        statuses.forEach(status => {
            const count = statusData[status] || 0;
            const percentage = Math.round((count / total) * 100);
            
            const statusItem = document.createElement('div');
            statusItem.className = 'status-item';
            
            const statusColor = document.createElement('div');
            statusColor.className = 'status-color';
            statusColor.style.backgroundColor = getColorForStatus(status);
            
            const statusLabel = document.createElement('div');
            statusLabel.className = 'status-label';
            statusLabel.textContent = `${formatStatusName(status)}: ${count} (${percentage}%)`;
            
            statusItem.appendChild(statusColor);
            statusItem.appendChild(statusLabel);
            statusChartContainer.appendChild(statusItem);
        });
        
        statusChart.appendChild(statusChartContainer);
    }
    
    // Format status name for display
    function formatStatusName(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
    
    // Load all complaints for complaints page
    async function loadComplaintsData() {
        try {
            // Reset pagination
            currentPage_complaints = 1;
            
            // Get filter values
            const status = statusFilter.value;
            const tag = tagFilter.value;
            
            // Construct query parameters
            let queryParams = new URLSearchParams();
            if (status) queryParams.append('status', status);
            if (tag) queryParams.append('tag', tag);
            
            // Fetch complaints from backend
            const response = await fetch(`${API_URL}/admin/complaints?${queryParams}`, {
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch complaints');
            
            const data = await response.json();
            
            // Store filtered complaints
            complaintsData = data.complaints || [];
            filteredComplaints = [...complaintsData];
            
            // Update complaint count
            complaintCount.textContent = complaintsData.length;
            
            // Display complaints
            displayComplaints();
            
        } catch (error) {
            console.error('Error loading complaints data:', error);
            showToast('error', 'Failed to load complaints data');
        }
    }
    
    // Display complaints with pagination
    function displayComplaints() {
        complaintsTable.innerHTML = '';
        
        if (filteredComplaints.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">No complaints found</td>
            `;
            complaintsTable.appendChild(row);
            pageIndicator.textContent = '0 of 0';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
            return;
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredComplaints.length / pageSize);
        if (currentPage_complaints > totalPages) {
            currentPage_complaints = totalPages;
        }
        
        const startIndex = (currentPage_complaints - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredComplaints.length);
        
        // Update pagination controls
        pageIndicator.textContent = `${currentPage_complaints} of ${totalPages}`;
        prevPageBtn.disabled = currentPage_complaints <= 1;
        nextPageBtn.disabled = currentPage_complaints >= totalPages;
        
        // Display current page of complaints
        for (let i = startIndex; i < endIndex; i++) {
            const complaint = filteredComplaints[i];
            const row = document.createElement('tr');
            
            // Format tags as badges
            const tagsBadges = complaint.tags 
                ? complaint.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join(' ')
                : '';
            
            row.innerHTML = `
                <td>${complaint.id}</td>
                <td>${complaint.title}</td>
                <td><span class="status-badge ${complaint.status}">${complaint.status}</span></td>
                <td>${tagsBadges}</td>
                <td>${formatDate(complaint.created_at)}</td>
                <td>
                    <button class="btn-icon view-complaint" data-id="${complaint.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            complaintsTable.appendChild(row);
        }
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-complaint').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                openComplaintDetail(id);
            });
        });
    }
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            filteredComplaints = [...complaintsData]; // Reset to original data
        } else {
            filteredComplaints = complaintsData.filter(complaint => 
                complaint.title.toLowerCase().includes(searchTerm) ||
                complaint.description.toLowerCase().includes(searchTerm) ||
                complaint.id.toString().includes(searchTerm) ||
                (complaint.tags && complaint.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        // Reset to first page and display
        currentPage_complaints = 1;
        displayComplaints();
    });
    
    // Filter functionality
    applyFiltersBtn.addEventListener('click', function() {
        loadComplaintsData();
    });
    
    clearFiltersBtn.addEventListener('click', function() {
        statusFilter.value = '';
        tagFilter.value = '';
        loadComplaintsData();
    });
    
    // Pagination controls
    prevPageBtn.addEventListener('click', function() {
        if (currentPage_complaints > 1) {
            currentPage_complaints--;
            displayComplaints();
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredComplaints.length / pageSize);
        if (currentPage_complaints < totalPages) {
            currentPage_complaints++;
            displayComplaints();
        }
    });
    
    // Load settings data
    function loadSettingsData() {
        // This would typically fetch the admin's profile from the backend
        // For now, we're using session storage data set during login
        
        const email = sessionStorage.getItem('adminEmail');
        if (email) {
            emailSettingsInput.value = email;
            displayNameInput.value = email.split('@')[0];
        }
    }
    
    // Settings form submission
    accountForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const displayName = displayNameInput.value.trim();
        const email = emailSettingsInput.value.trim();
        
        if (!displayName || !email) {
            showToast('error', 'Please fill in all required fields');
            return;
        }
        
        try {
            // Update profile on backend
            const response = await fetch(`${API_URL}/admin/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify({ display_name: displayName, email })
            });
            
            if (!response.ok) throw new Error('Failed to update profile');
            
            // Update session storage
            sessionStorage.setItem('adminEmail', email);
            
            // Update UI
            adminName.textContent = displayName;
            
            showToast('success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('error', 'Failed to update profile');
        }
    });
    
    // Password change form submission
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('error', 'Please fill in all password fields');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('error', 'New passwords do not match');
            return;
        }
        
        if (newPassword.length < 8) {
            showToast('error', 'Password must be at least 8 characters long');
            return;
        }
        
        try {
            // Update password on backend
            const response = await fetch(`${API_URL}/admin/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify({ 
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update password');
            }
            
            // Clear password fields
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            
            showToast('success', 'Password updated successfully');
        } catch (error) {
            console.error('Error updating password:', error);
            showToast('error', error.message || 'Failed to update password');
        }
    });
    
    // Open complaint detail modal
// Open complaint detail modal
async function openComplaintDetail(id) {
    try {
        currentComplaintId = id;
        
        // Find complaint in existing data
        let complaint = complaintsData.find(c => c.id.toString() === id.toString());
        
        // If not found in local data, fetch from backend
        if (!complaint) {
            const response = await fetch(`${API_URL}/admin/complaints/${id}`, {
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch complaint details');
            
            complaint = await response.json();
        }
        
        // Update modal with complaint details
        modalTitle.textContent = `Complaint #${complaint.id}`;
        detailId.textContent = complaint.id;
        detailTitle.textContent = complaint.title;
        detailDescription.textContent = complaint.description;
        
        // Update status dropdown
        detailStatus.value = complaint.status;
        
        // Format and display tags
        detailTags.innerHTML = '';
        if (complaint.tags && complaint.tags.length > 0) {
            complaint.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag-badge';
                tagElement.textContent = tag;
                detailTags.appendChild(tagElement);
            });
        } else {
            detailTags.textContent = 'No tags';
        }
        
        // Format date
        detailCreated.textContent = formatDate(complaint.created_at);
        
        // Display upvotes
        detailUpvotes.textContent = complaint.upvotes || 0;
        
        // Display image if available
        if (complaint.image_url) {
            detailImage.src = complaint.image_url;
            imageContainer.classList.remove('hidden');
        } else {
            imageContainer.classList.add('hidden');
        }
        
        // Load comments
        loadComments(id);
        
        // Store current index for navigation
        currentComplaintIndex = filteredComplaints.findIndex(c => c.id.toString() === id.toString());
        
        // Show modal
        complaintModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    } catch (error) {
        console.error('Error opening complaint detail:', error);
        showToast('error', 'Failed to load complaint details');
    }
}

// Update complaint status
// Update complaint status
updateStatusBtn.addEventListener('click', async function() {
    const status = detailStatus.value;
    if (!status || !currentComplaintId) {
        console.log('Missing status or complaint ID:', status, currentComplaintId);
        return;
    }
    
    try {
        console.log('Updating status to:', status, 'for complaint:', currentComplaintId);
        
        // Make the API call to update status
        const response = await fetch(`${API_URL}/admin/complaints/${currentComplaintId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({ status })
        });
        
        // Log the response for debugging
        console.log('Status update response:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            throw new Error('Failed to update status');
        }
        
        // Update local data
        const complaintIndex = complaintsData.findIndex(c => c.id.toString() === currentComplaintId.toString());
        if (complaintIndex !== -1) {
            complaintsData[complaintIndex].status = status;
            
            // Also update in filtered list if present
            const filteredIndex = filteredComplaints.findIndex(c => c.id.toString() === currentComplaintId.toString());
            if (filteredIndex !== -1) {
                filteredComplaints[filteredIndex].status = status;
            }
        }
        
        // Update the status badge in the modal
        const statusBadges = document.querySelectorAll('.status-badge');
        statusBadges.forEach(badge => {
            const row = badge.closest('tr');
            if (row && row.querySelector(`[data-id="${currentComplaintId}"]`)) {
                badge.textContent = status;
                badge.className = `status-badge ${status}`;
            }
        });
        
        // Refresh current view data
        if (currentPage === 'overview') {
            loadOverviewData();
        } else if (currentPage === 'complaints') {
            displayComplaints();
        }
        
        showToast('success', 'Status updated successfully');
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('error', error.message || 'Failed to update status');
    }
});
    
async function loadComments(complaintId) {
    try {
        commentsList.innerHTML = '';
        
        // Check if the comments endpoint exists (it seems it doesn't based on your error)
        // Instead of failing the entire complaint detail view, let's just show a placeholder
        const noComments = document.createElement('div');
        noComments.className = 'no-comments';
        noComments.textContent = 'Comments feature not available';
        commentsList.appendChild(noComments);
        
        // Skip the actual fetch since we know it will fail with 404
        return;
        
        /* Original code commented out to prevent 404 errors
        const response = await fetch(`${API_URL}/admin/complaints/${complaintId}/comments`, {
            headers: {
                'Authorization': authToken
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch comments');
        
        const comments = await response.json();
        
        if (comments.length === 0) {
            const noComments = document.createElement('div');
            noComments.className = 'no-comments';
            noComments.textContent = 'No comments yet';
            commentsList.appendChild(noComments);
            return;
        }
        
        comments.forEach(comment => {
            // Comment display code...
        });
        */
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<div class="error-message">Comments not available</div>';
    }
}
    
    // Add comment to a complaint
    addCommentBtn.addEventListener('click', async function() {
        const content = commentText.value.trim();
        if (!content || !currentComplaintId) return;
        
        try {
            const response = await fetch(`${API_URL}/admin/complaints/${currentComplaintId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify({ content })
            });
            
            if (!response.ok) throw new Error('Failed to add comment');
            
            // Clear input
            commentText.value = '';
            
            // Reload comments
            loadComments(currentComplaintId);
            
            showToast('success', 'Comment added successfully');
        } catch (error) {
            console.error('Error adding comment:', error);
            showToast('error', 'Failed to add comment');
        }
    });
    
    // Update complaint status
    updateStatusBtn.addEventListener('click', async function() {
        const status = detailStatus.value;
        if (!status || !currentComplaintId) return;
        
        try {
            const response = await fetch(`${API_URL}/admin/complaints/${currentComplaintId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify({ status })
            });
            
            if (!response.ok) throw new Error('Failed to update status');
            
            // Update local data
            const complaintIndex = complaintsData.findIndex(c => c.id.toString() === currentComplaintId.toString());
            if (complaintIndex !== -1) {
                complaintsData[complaintIndex].status = status;
                
                // Also update in filtered list if present
                const filteredIndex = filteredComplaints.findIndex(c => c.id.toString() === currentComplaintId.toString());
                if (filteredIndex !== -1) {
                    filteredComplaints[filteredIndex].status = status;
                }
            }
            
            // Refresh current view data
            if (currentPage === 'overview') {
                loadOverviewData();
            } else if (currentPage === 'complaints') {
                displayComplaints();
            }
            
            showToast('success', 'Status updated successfully');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('error', 'Failed to update status');
        }
    });
    
    // Delete complaint
    deleteComplaintBtn.addEventListener('click', function() {
        if (!currentComplaintId) return;
        
        // Show confirmation dialog
        confirmTitle.textContent = 'Delete Complaint';
        confirmMessage.textContent = `Are you sure you want to delete complaint #${currentComplaintId}? This action cannot be undone.`;
        
        // Set callback for confirmation
        confirmCallback = async function() {
            try {
                const response = await fetch(`${API_URL}/admin/complaints/${currentComplaintId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': authToken
                    }
                });
                
                if (!response.ok) throw new Error('Failed to delete complaint');
                
                // Remove from local data
                complaintsData = complaintsData.filter(c => c.id.toString() !== currentComplaintId.toString());
                filteredComplaints = filteredComplaints.filter(c => c.id.toString() !== currentComplaintId.toString());
                
                // Refresh current view data
                if (currentPage === 'overview') {
                    loadOverviewData();
                } else if (currentPage === 'complaints') {
                    displayComplaints();
                }
                
                // Close modal
                closeComplaintModal();
                
                showToast('success', 'Complaint deleted successfully');
            } catch (error) {
                console.error('Error deleting complaint:', error);
                showToast('error', 'Failed to delete complaint');
            }
        };
        
        // Show confirmation dialog
        confirmDialog.classList.remove('hidden');
    });
    
    // Close complaint modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeComplaintModal);
    });
    
    function closeComplaintModal() {
        complaintModal.classList.add('hidden');
        confirmDialog.classList.add('hidden');
        document.body.classList.remove('modal-open');
        currentComplaintId = null;
    }
    
    // Confirmation dialog
    confirmYesBtn.addEventListener('click', function() {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        confirmDialog.classList.add('hidden');
        confirmCallback = null;
    });
    
    confirmNoBtn.addEventListener('click', function() {
        confirmDialog.classList.add('hidden');
        confirmCallback = null;
    });
    
    // Toast notifications
    function showToast(type, message) {
        // Set icon based on type
        if (type === 'success') {
            toastIcon.className = 'fas fa-check-circle';
            toast.className = 'toast toast-success';
        } else if (type === 'error') {
            toastIcon.className = 'fas fa-exclamation-circle';
            toast.className = 'toast toast-error';
        } else {
            toastIcon.className = 'fas fa-info-circle';
            toast.className = 'toast toast-info';
        }
        
        // Set message
        toastMessage.textContent = message;
        
        // Show toast
        toast.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Utility functions
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    function getColorForStatus(status) {
        switch (status) {
            case 'pending':
                return '#FFA500'; // Orange
            case 'working':
                return '#3498db'; // Blue
            case 'finished':
                return '#2ecc71'; // Green
            default:
                return '#95a5a6'; // Gray
        }
    }
    
    function getColorForCategory(category) {
        // Simple hash function to get a color
        const colors = [
            '#3498db', // Blue
            '#2ecc71', // Green
            '#e74c3c', // Red
            '#f39c12', // Orange
            '#9b59b6', // Purple
            '#1abc9c', // Turquoise
            '#34495e', // Dark Blue
            '#d35400', // Dark Orange
            '#c0392b', // Dark Red
            '#16a085', // Dark Green
        ];
        
        // Simple hash to get a consistent color for each category
        let hash = 0;
        for (let i = 0; i < category.length; i++) {
            hash = category.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    // Event listeners for keypress
    document.addEventListener('keydown', function(e) {
        // Escape key closes modals
        if (e.key === 'Escape') {
            if (!complaintModal.classList.contains('hidden')) {
                closeComplaintModal();
            }
            if (!confirmDialog.classList.contains('hidden')) {
                confirmDialog.classList.add('hidden');
                confirmCallback = null;
            }
        }
    });
    
    // Handle clicks outside of modals to close them
    window.addEventListener('click', function(e) {
        if (e.target === complaintModal) {
            closeComplaintModal();
        }
        if (e.target === confirmDialog) {
            confirmDialog.classList.add('hidden');
            confirmCallback = null;
        }
    });
    
    // Initial load
    checkLoginStatus();
});

// Add event listener for reconnection
window.addEventListener('online', function() {
    const authToken = sessionStorage.getItem('adminToken'); // Retrieve stored token
    console.log("Auth Token Sent:", authToken); // Debugging line
    if (authToken) {
        loadDashboardData();
        showToast('success', 'Reconnected to server');
    }
});

// Add event listener for connection loss
window.addEventListener('offline', function() {
    showToast('error', 'Connection lost. Please check your internet connection.');
});

// Helper function to prevent XSS
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Feature detection for browser compatibility
function checkBrowserSupport() {
    const features = {
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        classList: typeof document.createElement('div').classList !== 'undefined'
    };
    
    let unsupportedFeatures = [];
    
    for (let feature in features) {
        if (!features[feature]) {
            unsupportedFeatures.push(feature);
        }
    }
    
    if (unsupportedFeatures.length > 0) {
        const warningMessage = `Your browser does not support the following features: ${unsupportedFeatures.join(', ')}. The application may not function correctly.`;
        console.warn(warningMessage);
        
        const warningEl = document.createElement('div');
        warningEl.className = 'browser-warning';
        warningEl.textContent = warningMessage;
        document.body.insertBefore(warningEl, document.body.firstChild);
    }
}

// Run browser check
checkBrowserSupport();