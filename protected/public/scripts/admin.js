// Function to dynamically create the table
function createTable() {
    var tableContainer = document.getElementById("adminResultContainer");
    var table = document.createElement("table");
    table.id = "dynamicTable";
    var thead = document.createElement("thead");
    var tbody = document.createElement("tbody");

    var headerRow = document.createElement("tr");
    var headers = [
        "Username", "Permission"
    ];

    const tableDiv = document.createElement('div');
    tableDiv.id = 'tableDiv';

    // Create table headers
    headers.forEach(function (header) {
        var th = document.createElement("th");

        th.textContent = header;
        
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    tableContainer.appendChild(tableDiv);
    tableDiv.appendChild(table);

    populateTable();
}

// Function to dynamically populate the table with the responseData
async function populateTable() {
    const tableBody = document.querySelector("#dynamicTable tbody");

    try{
        const response = await fetch('/adminListUsers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const responseData = await response.json();

        responseData.result.forEach(function (data) {
            var row = document.createElement("tr");
            // Loop through each property in the data object and create table cells
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var cell = document.createElement("td");
                    cell.textContent = data[key];
                    row.appendChild(cell);
                }
            }
            tableBody.appendChild(row);
        });

    }
    catch (error) {
        console.error('Uh oh!', error);
    }
}

function createEditTable(user){
    var tableContainer = document.getElementById('adminResultContainer');
    var table = document.createElement('table');
    table.id = 'dynamicTable';
    var thead = document.createElement('thead');
    var tbody = document.createElement('tbody');
    const submitButton = document.createElement('button');
    const deleteButton = document.createElement('button');

    var headerRow = document.createElement('tr');
    var headers = [
        'Username', 'Permission', 'Password'
    ];

    const tableDiv = document.createElement('div');
    tableDiv.id = 'tableDiv';

    // Create table headers
    headers.forEach(function (header) {
        var th = document.createElement("th");

        th.textContent = header;
        
        headerRow.appendChild(th);
    });

    submitButton.textContent = 'Submit Changes';
    submitButton.id = 'editUserSubmitButton';

    deleteButton.textContent = 'DELETE USER';
    deleteButton.id = 'deleteButton';

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    tableContainer.appendChild(tableDiv);
    tableDiv.appendChild(table);
    tableDiv.appendChild(submitButton);
    tableDiv.appendChild(deleteButton);

    populateEditTable(user);
}

async function populateEditTable(user){
    const tableBody = document.querySelector('#dynamicTable tbody');

    const payload = {
        user
    }

    try{
        const response = await fetch('/adminListEditUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const responseData = await response.json();
        console.log(responseData);

        //console.log(responseData);
        responseData.result.forEach(function (data) {
            var row = document.createElement('tr');
            // Loop through each property in the data object and create table cells
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    const cell = document.createElement('td');
                    const input = document.createElement('input');
                    const dropdown = document.createElement('select');
                    input.setAttribute('value', data[key]);
                    if(key === 'username'){
                        input.id = 'usernameEdit';
                        cell.appendChild(input);
                    }
                    else if(key === 'permission'){
                        dropdown.id = 'permissionEdit';
                        dropdown.class = 'formInput';
                    
                        const adminOption = document.createElement('option');
                        adminOption.innerHTML = 'Administrator';
                        adminOption.value = 'Administrator';
                    
                        const dispatchOption = document.createElement('option');
                        dispatchOption.innerHTML = 'Dispatch';
                        dispatchOption.value = 'Dispatch';
                    
                        const plantOption = document.createElement('option');
                        plantOption.innerHTML = 'Plant';
                        plantOption.value = 'Plant';
                    
                        const viewerOption = document.createElement('option');
                        viewerOption.innerHTML = 'Viewer';
                        viewerOption.value = 'Viewer';
            
                        dropdown.appendChild(adminOption);
                        dropdown.appendChild(dispatchOption);
                        dropdown.appendChild(plantOption);
                        dropdown.appendChild(viewerOption);
                        cell.appendChild(dropdown);

                        for (let i = 0; i < dropdown.options.length; i++){
                            if (dropdown.options[i].value === data[key]){
                                dropdown.options[i].selected = true;
                                break;
                            };
                        }
                    }

                    row.appendChild(cell);
                }
            }
            const pwCell = document.createElement('td');
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.setAttribute('value', '');
            passwordInput.id = 'passwordEdit';
            pwCell.appendChild(passwordInput);
            row.appendChild(pwCell);
            tableBody.appendChild(row);
        });

    }
    catch (error) {
        console.error('Uh oh!', error);
    }
}

document.getElementById('createUser').addEventListener('click', async (event) => {
    event.preventDefault();
  
    // tries to remove previous form
    if (document.getElementById('userForm')) {
        document.getElementById('userForm').remove();
    }

    if(document.getElementById('tableDiv')){
        document.getElementById('tableDiv').remove();
    }
  
    // defines containers
    var userForm = document.createElement('form');
    userForm.setAttribute('id', 'userForm');
    var container = document.getElementById('adminResultContainer');

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text'
    usernameInput.id = 'usernameInput';
    usernameInput.class = 'formInput';
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password'
    passwordInput.id = 'passwordInput';
    passwordInput.class = 'formInput';
    const permissionInput = document.createElement('select');
    permissionInput.id = 'permissionInput';
    permissionInput.class = 'formInput';

    const adminOption = document.createElement('option');
    adminOption.innerHTML = 'Administrator';
    adminOption.value = 'Administrator';

    const dispatchOption = document.createElement('option');
    dispatchOption.innerHTML = 'Dispatch';
    dispatchOption.value = 'Dispatch';

    const plantOption = document.createElement('option');
    plantOption.innerHTML = 'Plant';
    plantOption.value = 'Plant';

    const viewerOption = document.createElement('option');
    viewerOption.innerHTML = 'Viewer';
    viewerOption.value = 'Viewer';

    permissionInput.appendChild(adminOption);
    permissionInput.appendChild(dispatchOption);
    permissionInput.appendChild(plantOption);
    permissionInput.appendChild(viewerOption);


    const userSubmit = document.createElement('input');
    userSubmit.type = 'button';
    userSubmit.id = 'userSubmit';
    userSubmit.value = 'Add User';


    const usernameDiv = createFormDiv('usernameDiv', '<span>*</span>Username:');
    usernameDiv.appendChild(usernameInput);
    userForm.appendChild(usernameDiv);

    const passwordDiv = createFormDiv('passwordDiv', '<span>*</span>Password:');
    passwordDiv.appendChild(passwordInput);
    userForm.appendChild(passwordDiv)

    const permissionDiv = createFormDiv('permissionDiv', '<span>*</span>Permission:');
    permissionDiv.appendChild(permissionInput);
    userForm.appendChild(permissionDiv);

    userForm.appendChild(userSubmit);
    container.appendChild(userForm);
    

    document.getElementById('userSubmit').addEventListener('click', async (event) => {
        event.preventDefault();
    
        // tries to remove previous form

        const username = document.getElementById('usernameInput').value;
        const password = document.getElementById('passwordInput').value;
        const permission = document.getElementById('permissionInput').value;

        if (document.getElementById('userForm')) {
            document.getElementById('userForm').remove();
        }

        const payload = {
            username,
            password,
            permission
        }
        if(username.includes(' ') || password.includes(' ')){
            alert('Credentials cannot contain spaces!');
            throw new Error('Credential requirement failure');
        }
        if(username.length < 3 ){
            alert('Username must be at least 3 characters long');
            throw new Error('Credential requirement failure');
        }
        if(password.length < 6 ){
            alert('Password must be at least 6 characters long');
            throw new Error('Credential requirement failure');
        }


        try {
            const response = await fetch('/adminCreateUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data from server.');
            }

            const responseData = (await response.text()).valueOf();
            if(responseData=='exists'){
                alert('User already exists!');
            }
            else{
                alert('User added successfully!');
            }
        }catch{
            console.error('Uh oh!', error);
        
        }

    });
});

document.getElementById('listUsers').addEventListener('click', async (event) => {

    if (document.getElementById('userForm')) {
        document.getElementById('userForm').remove();
    }

    if(document.getElementById('tableDiv')){
        document.getElementById('tableDiv').remove();
    }

    createTable();
});

document.getElementById('searchUsersSubmit').addEventListener('click', async (event) =>{
    event.preventDefault();

    if (document.getElementById('userForm')) {
        document.getElementById('userForm').remove();
    }

    if(document.getElementById('tableDiv')){
        document.getElementById('tableDiv').remove();
    }

    const username = document.getElementById('searchUsersInput').value;

    createEditTable(username);

    document.getElementById('editUserSubmitButton').addEventListener('click', async (event) => {
        event.preventDefault();

        const newUsername = document.getElementById('usernameEdit').value;
        const newPassword = document.getElementById('passwordEdit').value;
        const newPermission = document.getElementById('permissionEdit').value;

        if(newUsername.includes(' ') || newPassword.includes(' ')){
            alert('Credentials cannot contain spaces!');
            throw new Error('Credential requirement failure');
        }
        if(newUsername.length < 3 ){
            alert('Username must be at least 3 characters long');
            throw new Error('Credential requirement failure');
        }
        if(newPassword == ''){
        }
        else if(newPassword.length < 6 ){
            alert('Password must be at least 6 characters long');
            throw new Error('Credential requirement failure');
        }

        const payload = {
            username,
            newUsername,
            newPermission,
            newPassword
        }
    
        try{
            const response = await fetch('/adminEditUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const responseData = (await response.text()).valueOf();
            if(responseData=='exists'){
                alert('User already exists!');
            }
            else{
                alert('User has been edited!');
            }
        }
        catch (error) {
            console.error('Uh oh!', error);
        }
    });

    document.getElementById('deleteButton').addEventListener('click', async(event) => {
        event.preventDefault();
        let payload;
        if (confirm(`Are you sure you want to delete ${username}?`) == true){
            payload = {
                username
            }

            try{
                const response = await fetch('/adminDeleteUser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                
                alert(`USER (${username}) HAS BEEN DELETED! `);
                document.getElementById('searchUsersSubmit').click();
            }
            catch (error) {
                console.error('Uh oh!', error);
            }
        }
        

        
    })

});

newLogoutButton();

if(document.getElementById('schedulerButton')){
    document.getElementById('schedulerButton').addEventListener('click', function() {
        fetchProtectedRoute('Scheduler');
    });
}
if(document.getElementById('lookupButton')){
    document.getElementById('lookupButton').addEventListener('click', function(){
        fetchProtectedRoute('Lookup');
    });
}
if(document.getElementById('reportsButton')){
    document.getElementById('reportsButton').addEventListener('click', function(){
        fetchProtectedRoute('Reports');
    });
}
if(document.getElementById('adminButton')){
    document.getElementById('adminButton').addEventListener('click', function(){
        fetchProtectedRoute('Administration');
    });
}