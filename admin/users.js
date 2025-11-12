// 全局变量
let allUsers = [];
let currentEditUserId = null;

// 页面加载时检查管理员权限并加载数据
async function init() {
    await checkAdminAuth();
    await loadUsers();
    setupSearchListener();
}

// 检查管理员权限
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/admin/check', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            displayUsers(allUsers);
            updateStats(allUsers);
        } else {
            showError('Failed to load users');
        }
    } catch (error) {
        console.error('Load users error:', error);
        showError('Network error. Please refresh the page.');
    }
}

// 显示用户列表
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #999;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.organization)}</td>
            <td>
                <span class="user-badge ${user.is_admin ? 'badge-admin' : 'badge-user'}">
                    ${user.is_admin ? '<i class="fas fa-shield-alt"></i> Admin' : '<i class="fas fa-user"></i> User'}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-primary btn-sm" onclick="openEditUserModal(${user.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="openResetPasswordModal(${user.id}, '${escapeHtml(user.name)}')">
                        <i class="fas fa-key"></i> Reset
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 更新统计数据
function updateStats(users) {
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.is_admin).length;
    const totalRegular = totalUsers - totalAdmins;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalAdmins').textContent = totalAdmins;
    document.getElementById('totalRegular').textContent = totalRegular;
}

// 搜索功能
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(user => 
            user.name.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.organization.toLowerCase().includes(query)
        );
        displayUsers(filtered);
    });
}

// 打开添加用户模态框
function openAddUserModal() {
    currentEditUserId = null;
    document.getElementById('modalTitle').textContent = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('userModal').classList.add('active');
}

// 打开编辑用户模态框
function openEditUserModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    currentEditUserId = userId;
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userOrganization').value = user.organization;
    document.getElementById('userIsAdmin').checked = user.is_admin === 1;
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('userPassword').required = false;
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('userModal').classList.add('active');
}

// 关闭用户模态框
function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    document.getElementById('userForm').reset();
}

// 提交用户表单
document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const organization = document.getElementById('userOrganization').value.trim();
    const password = document.getElementById('userPassword').value;
    const isAdmin = document.getElementById('userIsAdmin').checked ? 1 : 0;
    
    // 验证
    if (!name || !username || !organization) {
        showModalError('Please fill in all required fields');
        return;
    }

    // 验证用户名格式
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        showModalError('Username must be 3-20 characters (letters, numbers, underscore)');
        return;
    }
    
    if (!userId && !password) {
        showModalError('Password is required for new users');
        return;
    }
    
    if (password && password.length < 6) {
        showModalError('Password must be at least 6 characters');
        return;
    }
    
    const userData = { name, username, organization, is_admin: isAdmin };
    if (password) {
        userData.password = password;
    }
    
    try {
        let response;
        if (userId) {
            // 编辑用户
            response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
        } else {
            // 添加用户
            response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            closeUserModal();
            showSuccess(userId ? 'User updated successfully' : 'User added successfully');
            await loadUsers();
        } else {
            showModalError(data.message || 'Operation failed');
        }
    } catch (error) {
        console.error('Save user error:', error);
        showModalError('Network error. Please try again.');
    }
});

// 删除用户
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('User deleted successfully');
            await loadUsers();
        } else {
            showError(data.message || 'Delete failed');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showError('Network error. Please try again.');
    }
}

// 打开重置密码模态框
function openResetPasswordModal(userId, userName) {
    document.getElementById('resetUserId').value = userId;
    document.getElementById('resetUserName').textContent = userName;
    document.getElementById('resetPasswordForm').reset();
    document.getElementById('resetModalError').style.display = 'none';
    document.getElementById('resetPasswordModal').classList.add('active');
}

// 关闭重置密码模态框
function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').classList.remove('active');
    document.getElementById('resetPasswordForm').reset();
}

// 提交重置密码表单
document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showResetModalError('Passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showResetModalError('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeResetPasswordModal();
            showSuccess('Password reset successfully');
        } else {
            showResetModalError(data.message || 'Password reset failed');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showResetModalError('Network error. Please try again.');
    }
});

// 登出
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showModalError(message) {
    const errorDiv = document.getElementById('modalError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showResetModalError(message) {
    const errorDiv = document.getElementById('resetModalError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// 初始化
init();
