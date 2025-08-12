// 全局变量
let selectedBookcase = null;
let currentBookcasePassword = null;
let ably = null;
let currentComic = null;
let currentPage = 1;
let totalPages = 1;
let currentZoom = 1.0;
let currentRotation = 0;

// Cloudinary 配置
const CLOUDINARY_CLOUD_NAME = 'dc5rhyjth';
const CLOUDINARY_API_KEY = '459597826878157';
const CLOUDINARY_UPLOAD_PRESET = 'comic_share';

// Ably 配置
const ABLY_API_KEY = 'nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Ably
    ably = new Ably.Realtime(ABLY_API_KEY);
    
    // 根据当前页面执行不同初始化
    const currentPath = window.location.pathname;
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
        initHomePage();
    } else if (currentPath.includes('share.html')) {
        initSharePage();
    } else if (currentPath.includes('read.html')) {
        initReadPage();
    }
});

// 首页初始化
function initHomePage() {
    // 绑定分享按钮
    const shareBtn = document.getElementById('start-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            window.location.href = 'share.html';
        });
    }
    
    // 绑定阅读按钮
    const readBtn = document.getElementById('start-read-btn');
    if (readBtn) {
        readBtn.addEventListener('click', function() {
            window.location.href = 'read.html';
        });
    }
}

// 分享页面初始化
function initSharePage() {
    generateBookcases();
    
    // 文件上传区域点击事件
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('comic-file');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        // 拖放功能
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelection();
            }
        });
        
        // 文件选择事件
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // 上传按钮事件
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadComic);
    }
    
    // 返回按钮事件
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // 复制密码按钮事件
    const copyBtn = document.getElementById('copy-password');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const password = document.getElementById('new-password').textContent;
            navigator.clipboard.writeText(password).then(() => {
                const btn = this;
                btn.textContent = '✓ 已复制';
                setTimeout(() => {
                    btn.textContent = '复制密码';
                }, 2000);
            });
        });
    }
}

// 阅读页面初始化
function initReadPage() {
    generateBookcases();
    
    // 验证密码按钮事件
    const verifyBtn = document.getElementById('verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyPassword);
    }
    
    // 密码输入框回车事件
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPassword();
            }
        });
    }
    
    // 密码显示切换
    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const input = document.getElementById('password-input');
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '👁️‍';
            } else {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    }
    
    // 查看器控制按钮事件
    document.getElementById('prev-page')?.addEventListener('click', prevPage);
    document.getElementById('next-page')?.addEventListener('click', nextPage);
    document.getElementById('fullscreen-btn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('rotate-btn')?.addEventListener('click', rotateComic);
    document.getElementById('fit-screen-btn')?.addEventListener('click', fitComicToScreen);
    
    // 返回按钮事件
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateComicDisplay();
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updateComicDisplay();
    }
}

// 放大
function zoomIn() {
    if (currentZoom < 3.0) {
        currentZoom += 0.25;
        updateComicDisplay();
    }
}

// 缩小
function zoomOut() {
    if (currentZoom > 0.5) {
        currentZoom -= 0.25;
        updateComicDisplay();
    }
}

// 旋转漫画
function rotateComic() {
    if (currentComic.format === 'pdf') {
        rotatePDF();
    } else if (currentComic.format === 'zip') {
        rotateImage();
    }
}

// 适应屏幕
function fitComicToScreen() {
    if (currentComic.format === 'pdf') {
        fitPDFToScreen();
    } else if (currentComic.format === 'zip') {
        fitImageToScreen();
    }
}

// 生成书柜
function generateBookcases() {
    const bookcaseGrid = document.querySelector('.bookcase-grid');
    if (!bookcaseGrid) return;
    
    bookcaseGrid.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const bookcase = document.createElement('div');
        bookcase.className = 'bookcase';
        bookcase.dataset.id = i;
        
        bookcase.innerHTML = `
            <div class="bookcase-icon">📚</div>
            <h3>书柜 ${i}</h3>
        `;
        
        bookcase.addEventListener('click', function() {
            // 移除其他书柜的选中状态
            document.querySelectorAll('.bookcase').forEach(b => b.classList.remove('selected'));
            
            // 选中当前书柜
            this.classList.add('selected');
            selectedBookcase = this.dataset.id;
            
            // 根据当前页面执行不同操作
            const currentPath = window.location.pathname;
            if (currentPath.includes('share.html')) {
                const uploadSection = document.querySelector('.upload-section');
                if (uploadSection) {
                    uploadSection.style.display = 'block';
                }
                const fileInfo = document.getElementById('file-info');
                if (fileInfo) {
                    fileInfo.style.display = 'none';
                }
                const successMessage = document.getElementById('success-message');
                if (successMessage) {
                    successMessage.style.display = 'none';
                }
                // 显示当前选中的书柜
                const selectedDisplay = document.getElementById('selected-bookcase-display');
                if (selectedDisplay) {
                    selectedDisplay.textContent = selectedBookcase;
                }
            } else if (currentPath.includes('read.html')) {
                const passwordSection = document.getElementById('password-section');
                if (passwordSection) {
                    passwordSection.style.display = 'block';
                }
                // 填充存储的密码
                const passwordInput = document.getElementById('password-input');
                if (passwordInput) {
                    const storedPassword = localStorage.getItem(`bookcase_${selectedBookcase}_password`);
                    passwordInput.value = storedPassword || '123456';
                }
            }
        });
        
        bookcaseGrid.appendChild(bookcase);
    }
}

// 处理文件选择
function handleFileSelection() {
    const fileInput = document.getElementById('comic-file');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (fileName) fileName.textContent = `文件名: ${file.name}`;
        if (fileSize) fileSize.textContent = `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        if (fileInfo) fileInfo.style.display = 'block';
    }
}

// 上传漫画
async function uploadComic() {
    const fileInput = document.getElementById('comic-file');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');
    
    if (!fileInput.files.length || !selectedBookcase) {
        alert('请选择书柜和文件');
        return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `bookcase_${selectedBookcase}`);
    
    // 显示进度条
    if (progressContainer) progressContainer.style.display = 'block';
    
    try {
        // 使用Cloudinary上传文件
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        // 添加进度处理
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        let chunks = [];
        
        while(true) {
            const {done, value} = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            // 更新进度条
            const progress = Math.round((receivedLength / contentLength) * 100);
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `上传中: ${progress}%`;
        }
        
        const chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for(let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
        }
        
        const result = JSON.parse(new TextDecoder("utf-8").decode(chunksAll));
        
        if (result.secure_url) {
            // 上传成功，生成新密码
            const newPassword = generateRandomPassword();
            
            // 更新书柜密码
            await updateBookcasePassword(selectedBookcase, newPassword);
            
            // 通过Ably发布新密码
            publishNewPassword(selectedBookcase, newPassword);
            
            // 显示成功消息
            const selectedBookcaseEl = document.getElementById('selected-bookcase');
            if (selectedBookcaseEl) selectedBookcaseEl.textContent = selectedBookcase;
            
            const newPasswordEl = document.getElementById('new-password');
            if (newPasswordEl) newPasswordEl.textContent = newPassword;
            
            const successMessage = document.getElementById('success-message');
            if (successMessage) successMessage.style.display = 'block';
            
            // 隐藏上传表单
            const uploadSection = document.querySelector('.upload-section');
            if (uploadSection) uploadSection.style.display = 'block';
            
            const fileInfo = document.getElementById('file-info');
            if (fileInfo) fileInfo.style.display = 'none';
            
            if (progressContainer) progressContainer.style.display = 'none';
        } else {
            throw new Error('上传失败');
        }
    } catch (error) {
        console.error('上传错误:', error);
        alert('上传失败，请重试: ' + error.message);
        if (progressContainer) progressContainer.style.display = 'none';
    }
}

// 验证密码
async function verifyPassword() {
    const passwordInput = document.getElementById('password-input');
    const password = passwordInput ? passwordInput.value : '';
    const errorMessage = document.getElementById('error-message');
    
    // 验证密码格式
    if (!/^[A-Za-z0-9]{6}$/.test(password)) {
        errorMessage.textContent = "密码必须是6位字母或数字组合";
        errorMessage.style.display = 'block';
        return;
    }
    
    if (!password || !selectedBookcase) {
        alert('请选择书柜并输入密码');
        return;
    }
    
    try {
        // 获取书柜密码
        const storedPassword = await getBookcasePassword(selectedBookcase);
        
        if (password === storedPassword) {
            // 密码正确，隐藏错误消息
            if (errorMessage) errorMessage.style.display = 'none';
            
            // 显示漫画查看器
            const passwordSection = document.getElementById('password-section');
            if (passwordSection) passwordSection.style.display = 'none';
            
            const comicViewer = document.getElementById('comic-viewer');
            if (comicViewer) comicViewer.style.display = 'block';
            
            // 获取书柜中的漫画
            const comics = await getComicsInBookcase(selectedBookcase);
            
            if (comics.length > 0) {
                // 显示第一个漫画
                currentComic = comics[0];
                displayComic(currentComic);
                
                // 显示当前密码
                const currentPasswordEl = document.getElementById('current-password');
                if (currentPasswordEl) currentPasswordEl.textContent = storedPassword;
                
                // 订阅密码更新
                subscribeToPasswordUpdates(selectedBookcase, (message) => {
                    const newPassword = message.data;
                    currentBookcasePassword = newPassword;
                    
                    const currentPasswordEl = document.getElementById('current-password');
                    if (currentPasswordEl) currentPasswordEl.textContent = newPassword;
                    
                    const updateIndicator = document.getElementById('password-update-indicator');
                    if (updateIndicator) updateIndicator.style.display = 'inline-block';
                    
                    // 更新本地存储
                    localStorage.setItem(`bookcase_${selectedBookcase}_password`, newPassword);
                    
                    // 5秒后隐藏更新指示器
                    setTimeout(() => {
                        const updateIndicator = document.getElementById('password-update-indicator');
                        if (updateIndicator) updateIndicator.style.display = 'none';
                    }, 5000);
                });
            } else {
                alert('该书柜中没有漫画');
            }
        } else {
            // 密码错误
            if (errorMessage) {
                errorMessage.textContent = "密码错误，请重新输入";
                errorMessage.style.display = 'block';
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (error) {
        console.error('验证密码错误:', error);
        alert('验证失败，请重试');
    }
}

// 显示漫画
function displayComic(comic) {
    const comicTitle = document.getElementById('comic-title');
    const pdfViewer = document.getElementById('pdf-viewer');
    const zipViewer = document.getElementById('zip-viewer');
    
    if (comicTitle) comicTitle.textContent = comic.name;
    
    if (comic.format === 'pdf') {
        if (pdfViewer) pdfViewer.style.display = 'block';
        if (zipViewer) zipViewer.style.display = 'none';
        displayPDF(comic.url);
    } else if (comic.format === 'zip') {
        if (pdfViewer) pdfViewer.style.display = 'none';
        if (zipViewer) zipViewer.style.display = 'block';
        displayZIP(comic.url);
    }
    
    // 重置页面和缩放
    currentPage = 1;
    currentZoom = 1.0;
    currentRotation = 0;
    updateComicDisplay();
}

// 更新漫画显示
function updateComicDisplay() {
    const pageCounter = document.getElementById('page-counter');
    const zoomPercent = document.getElementById('zoom-percent');
    
    if (pageCounter) pageCounter.textContent = `${currentPage}/${totalPages}`;
    if (zoomPercent) zoomPercent.textContent = `${Math.round(currentZoom * 100)}%`;
    
    // 更新按钮状态
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    // 应用缩放和旋转
    const canvas = document.getElementById('pdf-canvas');
    const image = document.getElementById('comic-image');
    
    if (canvas) {
        const rotation = canvas.dataset.rotation || 0;
        canvas.style.transform = `scale(${currentZoom}) rotate(${rotation}deg)`;
    }
    
    if (image) {
        const rotation = image.dataset.rotation || 0;
        image.style.transform = `scale(${currentZoom}) rotate(${rotation}deg)`;
    }
}

// 切换全屏
function toggleFullscreen() {
    const viewerContainer = document.querySelector('.viewer-container');
    
    if (!document.fullscreenElement) {
        if (viewerContainer) {
            viewerContainer.requestFullscreen().catch(err => {
                alert(`无法进入全屏模式: ${err.message}`);
            });
        }
    } else {
        document.exitFullscreen();
    }
}

// 生成随机密码
function generateRandomPassword() {
    const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}