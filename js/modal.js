/**
 * Modal Component Module
 * 提供统一的模态框管理接口
 */

class Modal {
    constructor(modalId = 'modal') {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.modal) return;

        // 点击模态框外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    /**
     * 打开模态框
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.body - 内容（支持 HTML）
     * @param {Array} options.actions - 按钮数组
     * @param {string} actions[].text - 按钮文本
     * @param {string} actions[].class - 按钮样式类（btn-primary, btn-secondary, btn-danger 等）
     * @param {Function} actions[].callback - 点击回调函数
     * @param {boolean} options.closeOnBackdrop - 是否允许点击背景关闭（默认 true）
     */
    open(options = {}) {
        const {
            title = 'Modal',
            body = '',
            actions = [],
            closeOnBackdrop = true
        } = options;

        if (!this.modal) return;

        // 设置标题
        const titleElement = this.modal.querySelector('#modalTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }

        // 设置内容
        const bodyElement = this.modal.querySelector('#modalBody');
        if (bodyElement) {
            bodyElement.innerHTML = body;
        }

        // 设置按钮
        const actionsElement = this.modal.querySelector('#modalActions');
        if (actionsElement) {
            actionsElement.innerHTML = '';
            actions.forEach((action) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `btn ${action.class || 'btn-primary'}`;
                button.textContent = action.text;
                button.onclick = () => {
                    if (action.callback) {
                        action.callback();
                    }
                };
                actionsElement.appendChild(button);
            });
        }

        // 设置背景点击关闭
        if (closeOnBackdrop) {
            this.modal.style.cursor = 'pointer';
        } else {
            this.modal.style.cursor = 'default';
        }

        // 显示模态框
        this.modal.classList.add('active');
    }

    /**
     * 关闭模态框
     */
    close() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
    }

    /**
     * 检查模态框是否打开
     */
    isOpen() {
        return this.modal && this.modal.classList.contains('active');
    }
}

// 全局模态框实例
let modalInstance = null;

/**
 * 加载模态框样式和 HTML
 */
function loadModalStyles() {
    // 检查样式是否已加载
    if (document.getElementById('modal-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
        /* ===== Modal Styles ===== */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .modal-header h3 {
            font-size: 1.25rem;
            color: #333;
            margin: 0;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: #999;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }

        .modal-close:hover {
            color: #333;
        }

        .modal-body {
            color: #666;
            font-size: 1rem;
            margin-bottom: 2rem;
            line-height: 1.5;
        }

        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .btn-primary {
            background: #1a5490;
            color: white;
        }

        .btn-primary:hover {
            background: #0d3a6f;
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .btn-danger {
            background: #dc3545;
            color: white;
        }

        .btn-danger:hover {
            background: #c82333;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-success:hover {
            background: #218838;
        }

        @media (max-width: 480px) {
            .modal-content {
                padding: 1.5rem;
            }

            .modal-actions {
                flex-direction: column;
            }

            .btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * 初始化全局模态框
 */
function initModal(modalId = 'modal') {
    console.log('Initializing modal with id:', modalId);
    
    // 加载样式
    loadModalStyles();
    
    // 检查 DOM 中是否存在模态框
    let modalElement = document.getElementById(modalId);
    
    // 如果不存在，创建模态框 DOM
    if (!modalElement) {
        console.log('Modal element not found, creating...');
        const modalHTML = `
            <div class="modal" id="${modalId}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitle">Modal Title</h3>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div id="modalBody" class="modal-body"></div>
                    <div id="modalActions" class="modal-actions"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modalElement = document.getElementById(modalId);
    }
    
    console.log('Modal element found:', modalElement);
    modalInstance = new Modal(modalId);
    console.log('Modal instance created:', modalInstance);
    return modalInstance;
}

/**
 * 打开模态框（全局方法）
 */
function openModal(options) {
    console.log('openModal called with options:', options);
    if (!modalInstance) {
        console.log('Modal instance not found, initializing...');
        initModal();
    }
    console.log('Opening modal with instance:', modalInstance);
    modalInstance.open(options);
}

/**
 * 关闭模态框（全局方法）
 */
function closeModal() {
    if (modalInstance) {
        modalInstance.close();
    }
}

/**
 * 显示确认对话框
 * @param {string} title - 标题
 * @param {string} message - 消息
 * @param {Function} onConfirm - 确认回调
 * @param {Function} onCancel - 取消回调
 */
function showConfirmDialog(title, message, onConfirm, onCancel) {
    console.log('showConfirmDialog called with title:', title);
    openModal({
        title: title,
        body: message,
        actions: [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                callback: () => {
                    closeModal();
                    if (onCancel) onCancel();
                }
            },
            {
                text: 'Confirm',
                class: 'btn-danger',
                callback: () => {
                    closeModal();
                    if (onConfirm) onConfirm();
                }
            }
        ]
    });
}

/**
 * 显示成功提示
 * @param {string} title - 标题
 * @param {string} message - 消息
 * @param {Function} onClose - 关闭回调
 */
function showSuccessDialog(title, message, onClose) {
    openModal({
        title: title,
        body: message,
        actions: [
            {
                text: 'OK',
                class: 'btn-success',
                callback: () => {
                    closeModal();
                    if (onClose) onClose();
                }
            }
        ]
    });
}

/**
 * 显示错误提示
 * @param {string} title - 标题
 * @param {string} message - 消息
 * @param {Function} onClose - 关闭回调
 */
function showErrorDialog(title, message, onClose) {
    openModal({
        title: title,
        body: message,
        actions: [
            {
                text: 'OK',
                class: 'btn-danger',
                callback: () => {
                    closeModal();
                    if (onClose) onClose();
                }
            }
        ]
    });
}
