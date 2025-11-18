// 全局变量
let allUsers = [];
let currentEditUserId = null;
let adminCountryList = null;
// 分页相关
let currentPage = 1;
let pageSize = 10; // 初始 10
let totalUsersCount = 0;
let totalPages = 1;

async function loadAdminCountries() {
    if (adminCountryList) return adminCountryList;
    try {
        const res = await fetch('../data/countries-simplified.json');
        if (!res.ok) throw new Error('Failed to load countries');
        const data = await res.json();
        adminCountryList = data;
        return adminCountryList;
    } catch (e) {
        console.warn('Failed to load countries list in admin view:', e);
        adminCountryList = [];
        return adminCountryList;
    }
}

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
        // 显示加载中
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #999;">Loading...</td></tr>';
        }

        const response = await fetch(`/api/admin/users?page=${currentPage}&pageSize=${pageSize}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users || [];
            totalUsersCount = data.total || 0;
            currentPage = data.page || 1;
            pageSize = data.pageSize || pageSize;
            totalPages = Math.max(1, Math.ceil(totalUsersCount / pageSize));
            displayUsers(allUsers);
            updatePagination();
            // 更新统计（来自后端统计接口）
            await loadStats();
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #999;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const isAdmin = Number(user.is_admin) === 1;

        const hasReceipt = !!(user.receipt_number && String(user.receipt_number).trim());
        const feeStatusText = hasReceipt ? 'Paid' : 'Not Paid';

        const viewButtonFull = isAdmin ? '' : `
            <button class="btn btn-secondary btn-sm" onclick="viewUserCM(${user.id})">
                <i class="fas fa-eye"></i> View
            </button>`;

        const receiptButtonFull = isAdmin ? '' : `
            <button class="btn btn-success btn-sm" onclick="openFeeReceiptModal(${user.id})">
                <i class="fas fa-receipt"></i> Receipt
            </button>`;

        const editButtonFull = `
            <button class="btn btn-primary btn-sm" onclick="openEditUserModal(${user.id})">
                <i class="fas fa-edit"></i> Edit
            </button>`;

        const resetButtonFull = `
            <button class="btn btn-secondary btn-sm" onclick="openResetPasswordModal(${user.id}, '${escapeHtml(user.name)}')">
                <i class="fas fa-key"></i> Reset
            </button>`;

        const deleteButtonFull = `
            <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')">
                <i class="fas fa-trash"></i> Delete
            </button>`;

        const viewItemCompact = isAdmin ? '' : `
            <button type="button" onclick="viewUserCM(${user.id})">
                <i class="fas fa-eye"></i><span>View</span>
            </button>`;

        const receiptItemCompact = isAdmin ? '' : `
            <button type="button" onclick="openFeeReceiptModal(${user.id})">
                <i class="fas fa-receipt"></i><span>Receipt</span>
            </button>`;

        return `
        <tr>
            <td data-label="ID">${user.id}</td>
            <td data-label="Name">${escapeHtml(user.name)}</td>
            <td data-label="Username">${escapeHtml(user.username)}</td>
            <td data-label="Organization">${escapeHtml(user.organization)}</td>
            <td data-label="Role">
                <span class="user-badge ${isAdmin ? 'badge-admin' : 'badge-user'}">
                    ${isAdmin ? '<i class="fas fa-shield-alt"></i> Admin' : '<i class="fas fa-user"></i> User'}
                </span>
            </td>
            <td data-label="Registered">${formatDate(user.created_at)}</td>
            <td data-label="Fee Status">
                <span class="fee-status ${hasReceipt ? 'paid' : 'unpaid'}">
                    ${feeStatusText}
                </span>
            </td>
            <td data-label="Actions">
                <div class="actions">
                    <div class="actions-full">
                        ${viewButtonFull}
                        ${receiptButtonFull}
                        ${editButtonFull}
                        ${resetButtonFull}
                        ${deleteButtonFull}
                    </div>
                    <div class="actions-compact">
                        <button type="button" class="btn btn-secondary btn-sm actions-toggle" onclick="toggleActionsDropdown(this)">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div class="actions-dropdown">
                            ${viewItemCompact}
                            ${receiptItemCompact}
                            <button type="button" onclick="openEditUserModal(${user.id})">
                                <i class="fas fa-edit"></i><span>Edit</span>
                            </button>
                            <button type="button" onclick="openResetPasswordModal(${user.id}, '${escapeHtml(user.name)}')">
                                <i class="fas fa-key"></i><span>Reset</span>
                            </button>
                            <button type="button" class="danger" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')">
                                <i class="fas fa-trash"></i><span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// 切换 Actions 三点菜单
function toggleActionsDropdown(button) {
    const currentRow = button.closest('.actions-compact');
    const currentDropdown = currentRow ? currentRow.querySelector('.actions-dropdown') : null;
    const isOpen = currentDropdown && currentDropdown.classList.contains('open');

    // 先关闭所有菜单
    document.querySelectorAll('.actions-dropdown.open').forEach(el => {
        el.classList.remove('open');
    });

    // 再根据当前状态决定是否打开
    if (!isOpen && currentDropdown) {
        currentDropdown.classList.add('open');
    }
}

// 全局：点击其他区域或按 Esc 关闭所有三点菜单
document.addEventListener('click', (event) => {
    const target = event.target;
    // 点击在 actions-compact 区域内时交给各自按钮处理
    if (target.closest('.actions-compact')) {
        return;
    }
    document.querySelectorAll('.actions-dropdown.open').forEach(el => {
        el.classList.remove('open');
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        document.querySelectorAll('.actions-dropdown.open').forEach(el => {
            el.classList.remove('open');
        });
    }
});

// 更新统计数据
// 从后端统计接口更新仪表数据
async function loadStats() {
    try {
        const resp = await fetch('/api/admin/stats', { credentials: 'include' });
        const data = await resp.json();
        if (data && data.success && data.stats) {
            updateStatsFromServer(data.stats);
        }
    } catch (e) {
        console.warn('Load stats failed:', e);
    }
}

function updateStatsFromServer(stats) {
    const totalUsers = stats.totalUsers || 0;
    const totalAdmins = stats.totalAdmins || 0;
    const totalRegular = Math.max(0, totalUsers - totalAdmins);
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalAdmins').textContent = totalAdmins;
    document.getElementById('totalRegular').textContent = totalRegular;
}

// 搜索功能
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        // 仅过滤当前页数据
        const filtered = allUsers.filter(user => 
            user.name.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.organization.toLowerCase().includes(query)
        );
        displayUsers(filtered);
    });
}

// 渲染分页控件状态
function updatePagination() {
    const info = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const sizeSel = document.getElementById('pageSizeSelect');
    if (info) {
        info.textContent = `Page ${currentPage} of ${Math.max(1, Math.ceil(totalUsersCount / pageSize))} · Total ${totalUsersCount}`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= Math.max(1, Math.ceil(totalUsersCount / pageSize));
    if (sizeSel && Number(sizeSel.value) !== Number(pageSize)) sizeSel.value = String(pageSize);
}

// 绑定分页事件
function setupPaginationControls() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const sizeSel = document.getElementById('pageSizeSelect');
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (currentPage > 1) {
                currentPage -= 1;
                await loadUsers();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (currentPage < Math.max(1, Math.ceil(totalUsersCount / pageSize))) {
                currentPage += 1;
                await loadUsers();
            }
        });
    }
    if (sizeSel) {
        sizeSel.addEventListener('change', async (e) => {
            const val = parseInt(e.target.value, 10);
            if ([10,20,50,100].includes(val)) {
                pageSize = val;
                currentPage = 1;
                await loadUsers();
            }
        });
    }
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
    document.getElementById('userIsAdmin').checked = Number(user.is_admin) === 1;
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
    showConfirmDialog(
        'Confirm Delete',
        `Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone.`,
        async () => {
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
    );
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

// 打开会费回执单号模态框
function openFeeReceiptModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const userIdInput = document.getElementById('feeReceiptUserId');
    const userNameSpan = document.getElementById('feeReceiptUserName');
    const userIdNumberInput = document.getElementById('feeReceiptIdNumber');
    const numberInput = document.getElementById('feeReceiptNumber');
    const errorDiv = document.getElementById('feeReceiptModalError');

    if (userIdInput) userIdInput.value = user.id;
    if (userNameSpan) userNameSpan.textContent = `${user.name} (${user.username})`;
    if (userIdNumberInput) userIdNumberInput.value = user.id_number || '';
    if (numberInput) numberInput.value = user.receipt_number || '';
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    const modal = document.getElementById('feeReceiptModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeFeeReceiptModal() {
    const modal = document.getElementById('feeReceiptModal');
    if (modal) {
        modal.classList.remove('active');
    }
    const form = document.getElementById('feeReceiptForm');
    if (form) {
        form.reset();
    }
    const errorDiv = document.getElementById('feeReceiptModalError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

// 提交会费回执单号表单
const feeReceiptForm = document.getElementById('feeReceiptForm');
if (feeReceiptForm) {
    feeReceiptForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const userIdInput = document.getElementById('feeReceiptUserId');
        const userIdNumberInput = document.getElementById('feeReceiptIdNumber');
        const numberInput = document.getElementById('feeReceiptNumber');
        const errorDiv = document.getElementById('feeReceiptModalError');

        const userId = userIdInput ? userIdInput.value : '';
        const idNumber = userIdNumberInput ? userIdNumberInput.value.trim() : '';
        const receiptNumber = numberInput ? numberInput.value.trim() : '';

        if (!receiptNumber) {
            if (errorDiv) {
                errorDiv.textContent = 'Receipt number is required';
                errorDiv.style.display = 'block';
            }
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}/fee-receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ receiptNumber, idNumber })
            });
            const data = await response.json();
            if (data.success) {
                closeFeeReceiptModal();
                showSuccess('Receipt number saved successfully');
                await loadUsers();
            } else if (errorDiv) {
                errorDiv.textContent = data.message || 'Failed to save receipt number';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            console.error('Save fee receipt error:', err);
            if (errorDiv) {
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.style.display = 'block';
            }
        }
    });
}

// 登出
function logout() {
    showConfirmDialog(
        'Confirm Logout',
        'Are you sure you want to logout?',
        async () => {
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
    );
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

// ===== Read-only view: Conference Management =====
const TOPIC_LABELS = {
    1: 'Session 1: Water Quality Security and Digital Technology',
    2: 'Session 2: Green Water Treatment and Resource Recycling',
    3: 'Session 3: Water Environment Remediation and Healthy Cities',
    4: 'Session 4: Environmental System Engineering and Risk Control',
    5: 'Session 5: Industry-Academia-Research Forum',
    6: 'Session 6: Journal Forum of Energy & Environmental Sustainability',
    7: 'Session 7: Youth Student Forum'
};

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = (value === 0 || value) ? String(value) : '-';
}

function formatAuthorsValue(raw) {
    if (!raw) return '-';
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const names = parsed.map(a => `${a.firstName || ''} ${a.surname || ''}`.trim()).filter(Boolean);
            return names.length ? names.join(', ') : '-';
        }
    } catch (e) {
        // not JSON, fall through
    }
    // legacy newline separated or plain string
    return String(raw).trim() || '-';
}

// 仅以多行快速列表渲染作者：
// 1) First Surname\n2) ...
function renderAuthorsQuickOnly(raw) {
    const quick = document.getElementById('cmAuthorsQuick');
    if (!quick) return;
    let authors = [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) authors = parsed;
    } catch (e) {
        const lines = String(raw || '').split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length) {
            authors = lines.map(line => {
                const firstChunk = line.split(',')[0] || '';
                const parts = firstChunk.split(' ').filter(Boolean);
                return { firstName: parts[0] || '', surname: parts.slice(1).join(' ') };
            });
        }
    }
    if (!authors.length) {
        quick.textContent = '-';
        return;
    }
    const text = authors.map((a, i) => {
        const fn = (a.firstName || '').trim();
        const sn = (a.surname || '').trim();
        const full = [fn, sn].filter(Boolean).join(' ') || '-';
        return `${i + 1}) ${full}`;
    }).join('\n');
    quick.textContent = text;
}

async function viewUserCM(userId) {
    const user = allUsers.find(u => u.id === userId);
    setText('cmUserName', user ? `${user.name} (ID: ${user.id})` : String(userId));
    document.getElementById('cmError').style.display = 'none';
    // 先置灰下载按钮，等拿到数据后再决定是否启用
    const preDlBtn = document.getElementById('cmDownloadBtn');
    if (preDlBtn) {
        preDlBtn.disabled = true;
        delete preDlBtn.dataset.url;
        delete preDlBtn.dataset.name;
        preDlBtn.title = 'No file to download';
        preDlBtn.setAttribute('aria-disabled', 'true');
    }

    try {
        try {
            const [feeRes, absRes, countries] = await Promise.all([
                fetch(`/api/admin/users/${userId}/fee-payment`, { credentials: 'include' }),
                fetch(`/api/admin/users/${userId}/abstract`, { credentials: 'include' }),
                loadAdminCountries()
            ]);

            const feeData = await feeRes.json();
            const absData = await absRes.json();

            // Fee payment（除了回执单号，其余字段都从 fee_payments 里读）
            const p = feeData && feeData.payment ? feeData.payment : {};
            setText('cmPaperNumber', p.paper_number);
            setText('cmReceiptNumber', user ? user.receipt_number : undefined);
            setText('cmName', p.name);
            setText('cmGender', p.gender);
            setText('cmEmail', p.email);
            setText('cmCategory', p.participant_category);
            let countryDisplay = p.country;
            if (countryDisplay && Array.isArray(countries) && countries.length > 0) {
                const byCode = countries.find(c => c.code === countryDisplay);
                const byName = countries.find(c => c.name === countryDisplay);
                if (byCode) {
                    countryDisplay = byCode.name;
                } else if (byName) {
                    countryDisplay = byName.name;
                }
            }
            setText('cmCountry', countryDisplay);
            setText('cmInstitution', p.institution);
            setText('cmState', p.state_province);
            setText('cmCity', p.city);
            setText('cmAddress', p.address);
            setText('cmZip', p.zip_code);
            setText('cmAffiliation', p.affiliation);
            setText('cmMobilePhone', p.mobile_phone);
            setText('cmRemarks', p.remarks);

            // Abstract submission
            const s = absData && absData.submission ? absData.submission : {};
            setText('cmTitle', s.title);
            renderAuthorsQuickOnly(s.authors);
            setText('cmAff', s.affiliation);
            const topicText = (s.topic || s.topic === 0) ? (TOPIC_LABELS[s.topic] || String(s.topic)) : '-';
            setText('cmTopic', topicText);
            setText('cmAbstractText', s.abstract);
            setText('cmKeywords', s.keywords);

            const nameSpan = document.getElementById('cmFileName');
            const dlBtn = document.getElementById('cmDownloadBtn');
            if (s && s.file_path) {
                const fileUrl = `/server/uploads/${s.file_path}`;
                nameSpan.textContent = s.original_filename || s.file_path;
                if (dlBtn) {
                    dlBtn.disabled = false;
                    dlBtn.dataset.url = fileUrl;
                    dlBtn.dataset.name = s.original_filename || s.file_path;
                    dlBtn.title = 'Download file';
                    dlBtn.setAttribute('aria-disabled', 'false');
                }
            } else {
                nameSpan.textContent = '-';
                if (dlBtn) {
                    dlBtn.disabled = true;
                    delete dlBtn.dataset.url;
                    delete dlBtn.dataset.name;
                    dlBtn.title = 'No file to download';
                    dlBtn.setAttribute('aria-disabled', 'true');
                }
            }

            document.getElementById('viewCMModal').classList.add('active');
        } catch (err) {
            console.error('Load CM error:', err);
            const errDiv = document.getElementById('cmError');
            errDiv.textContent = 'Failed to load conference data.';
            errDiv.style.display = 'block';
            document.getElementById('viewCMModal').classList.add('active');
        }
    } catch (err) {
        console.error('Load CM error:', err);
        const errDiv = document.getElementById('cmError');
        errDiv.textContent = 'Failed to load conference data.';
        errDiv.style.display = 'block';
        document.getElementById('viewCMModal').classList.add('active');
    }
}

function closeViewCMModal() {
    document.getElementById('viewCMModal').classList.remove('active');
}

// 下载摘要文件（如果存在）
function downloadCMFile() {
    const btn = document.getElementById('cmDownloadBtn');
    if (!btn || btn.disabled || !btn.dataset.url) return;
    const a = document.createElement('a');
    a.href = btn.dataset.url;
    a.target = '_blank';
    a.download = btn.dataset.name || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 导出 View 弹窗内容为 PDF
async function exportCMToPDF() {
    try {
        const bodyEl = document.getElementById('cmBody');
        if (!bodyEl) return;
        const nameText = (document.getElementById('cmUserName')?.textContent || 'User').trim();
        document.body.classList.add('pdf-export');
        await new Promise(r => setTimeout(r, 0));
        const canvas = await html2canvas(bodyEl, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: 1200, // force desktop-like layout regardless of device width
            windowHeight: Math.max(bodyEl.scrollHeight, 1600),
            scrollX: 0,
            scrollY: 0,
            ignoreElements: function(el) {
                return el && el.classList && el.classList.contains('modal-footer-actions');
            }
        });
        const imgData = canvas.toDataURL('image/png');
        const jspdfNS = window.jspdf || {};
        const jsPDFCtor = jspdfNS.jsPDF;
        if (!jsPDFCtor) {
            alert('PDF library not loaded');
            return;
        }
        const pdf = new jsPDFCtor('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const headerY = 15;
        const startY = 25;
        const header = `Conference Management - ${nameText}`;

        pdf.setFontSize(12);
        pdf.text(header, margin, headerY);

        const imgWidth = pageWidth - margin * 2;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = startY;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - position - margin);

        while (heightLeft > 0) {
            pdf.addPage();
            pdf.setFontSize(12);
            pdf.text(header, margin, headerY);
            position = startY - (imgHeight - heightLeft);
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - startY - margin);
        }

        const safeName = nameText.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
        pdf.save(`Conference_${safeName}.pdf`);
    } catch (e) {
        console.error('Export PDF error:', e);
        alert('Export failed.');
    } finally {
        document.body.classList.remove('pdf-export');
    }
}

// 初始化
init();

// 绑定分页控件
setupPaginationControls();

// 允许通过 ESC 和点击遮罩关闭查看弹窗
(function setupViewCMModalInteractions() {
    const modal = document.getElementById('viewCMModal');
    if (!modal) return;
    // 点击遮罩关闭（仅当点击在遮罩本身，而非内容上）
    modal.addEventListener('click', (e) => {
        if (e.target === modal && modal.classList.contains('active')) {
            closeViewCMModal();
        }
    });
    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeViewCMModal();
        }
    });
})();
