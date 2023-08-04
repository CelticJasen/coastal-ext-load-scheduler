// Helper function to send POST requests
async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const contentType = response.headers.get('content-type');

        if(contentType && contentType.includes('text/html')) {
            return await response.text();
        }
        else{
            return await response.json();
        }
    }
    catch (error){
        console.error('Error:', error);
        throw error;
    }
}

function newLogoutButton(){
    document.getElementById('logoutBtn').addEventListener('click', () => {
        // Remove the token from localStorage
        localStorage.removeItem('token');
    
        // Show the login section and hide the protected route section
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('login').style.display = 'flex';
        document.getElementById('protectedMessage').innerHTML = '';
    });
}

// Function to fetch and display the protected route content
async function fetchProtectedRoute(route) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
    }

    try {
        let response;

        if(route === 'Lookup'){
            response = await fetch('/lookup', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        else if(route === 'Reports'){
            response = await fetch('/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        else if(route === 'Administration'){
            response = await fetch('/administration', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        else{
            response = await fetch('/scheduler', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        if(!response.ok){
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');

        if(contentType && contentType.includes('application/json')) {
            const data = await responseScript.json();
            document.getElementById('protectedMessage').textContent = JSON.stringify(data);
        }
        else {
            const htmlContent = await response.text();
            document.querySelector('title').textContent = 'External Load Scheduler';
            document.getElementById('protectedMessage').innerHTML = htmlContent;
        }

        let responseScript;

        if(route === 'Lookup'){
            responseScript = await fetch('/lookupScript', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        else if(route === 'Reports'){
            responseScript = await fetch('/reportsScript', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        else if(route === 'Administration'){
            responseScript = await fetch('/administrationScript', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        else{
            responseScript = await fetch('/schedulerScript', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }

        if (responseScript.ok) {
            const scriptContent = await responseScript.text();
            const script = document.createElement('script');
            script.textContent = scriptContent;
            document.getElementById('protectedMessage').appendChild(script);
        }
    }
    catch (error) {
        alert('Error fetching protected route.');
        console.error('Error:', error);
    }
}

document.getElementById('login').addEventListener('keypress', function(event){
    const key = event.key;

    if(key === 'Enter'){
        document.getElementById('loginBtn').click();
    }
});

// Login button click event
document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const loginData = { username, password };
    const response = await postData('/login', loginData);

    if (response.token) {
        // Save the token in localStorage for future authenticated requests
        localStorage.setItem('token', response.token);

        // Show the protected route section and hide the login section
        document.getElementById('login').style.display = 'none';
        document.getElementById('protected').style.display = 'block';

        // Fetch the protected route content
        fetchProtectedRoute('Scheduler');
    }
    else {
        alert('Login failed. Please check your credentials.');
    }
});

// Check if a token is present in localStorage for automatic login
const token = localStorage.getItem('token');
if (token) {
    document.getElementById('login').style.display = 'none';
    document.getElementById('protected').style.display = 'block';
    fetchProtectedRoute();
}
