function extractNumberAndText(input) {
    const numberRegex = /\d+/;
    const numberMatch = input.match(numberRegex);
    const text = input.replace(numberRegex, '').trim();
    const number = numberMatch ? parseInt(numberMatch[0]) : '';

    return { number, text };
}

function roundTimeToHalfHour(input) {
    const timeString = input.value;
    let [hours, minutes] = timeString.split(':').map(Number);
    if (hours < 10){
        hours = `0${hours}`;
    }

    if (minutes >= 0 && minutes < 30) {
        input.value = `${hours}:00`;
    }
    else if (minutes >= 30 && minutes <= 59) {
        input.value = `${hours}:30`;
    } 
    else {
        const roundedHours = hours + 1;
        input.value = `${roundedHours}:00`;
    }
}

// Function to dynamically create the table
function createTable() {
    let tableContainer = document.getElementById('resultContainer');
    let table = document.createElement('table');
    table.id = 'dynamicTable';
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    let headers = [
        'ID', 'Lift #', 'Load Date', 'Load Time', 'Delivery Date', 'Delivery Time', 'Product', 'Qty', 'Origin Company', 'Origin', 'Customer Name', 'Carrier', 'Bill To', 'Dest. City', 'Dest. State', 'Timestamp', 'Completed', 'DELETE'
    ];

    const tableDiv = document.createElement('div');
    tableDiv.id = 'tableDiv';

    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'buttonDiv';

    let saveChangesButton = document.createElement('INPUT');
    saveChangesButton.id = 'saveChangesButton';
    saveChangesButton.setAttribute('type', 'submit');
    saveChangesButton.setAttribute('value', 'Save Changes');

    // Create table headers
    headers.forEach(function (header) {
        let th = document.createElement("th");

        th.textContent = header;
        
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    tableContainer.appendChild(tableDiv);
    tableDiv.appendChild(table);
    tableContainer.appendChild(buttonDiv);
    buttonDiv.appendChild(saveChangesButton);
    const responseTextLookup = document.createElement('h1');
    responseTextLookup.setAttribute('id', 'responseTextLookup');

    const editExternalRecord = async (event) => {
        event.preventDefault();

        if (document.getElementById('responseTextLookup')) {
            document.getElementById('responseTextLookup').remove();
        }
        const tableRows = document.querySelector('tbody').querySelectorAll('tr');
        let editArray = [];
        tableRows.forEach(function(row){
            const id = row.querySelector('.id').innerText;
            const loadDate = row.querySelector('.loadDateEdit').value;
            const delDate = row.querySelector('.delDateEdit').value;
            let loadTime = row.querySelector('.loadTimeEdit').value;
            let delTime = row.querySelector('.delTimeEdit').value;
            if(loadTime === ''){
                loadTime = null;
            }
            if(delTime === ''){
                delTime === null;
            }
            const product = row.querySelector('.productEdit').value;
            const quantity = `${row.querySelector('.quantityEdit').value} ${row.querySelector('.quantityEditType').value}`;
            const billTo = row.querySelector('.billToEdit').value;

            const username = `${localStorage.getItem('username')}`;
    
            const payload = {
                id,
                loadDate,
                loadTime,
                delDate,
                delTime,
                product,
                quantity,
                billTo,
                username,
            };
            
            editArray.push(payload);
        });

        try {
            const response = await fetch('/update-record', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(editArray),
            });
        
            if (response.ok) {
                document.getElementById('submit_button').click();
                responseTextLookup.innerHTML = 'Data submitted successfully!';
                buttonDiv.appendChild(responseTextLookup);
            } else {
                responseTextLookup.innerHTML = '<span>Error submitting data! Data not entered!</span>';
                buttonDiv.appendChild(responseTextLookup);
                throw new Error('Failed to fetch data from server.');
            }
        } catch (error) {
            console.error('An error occurred:', error);
        }
    };
    saveChangesButton.addEventListener('click', editExternalRecord);
}

// Function to dynamically populate the table with the responseData
function populateTable(responseData) {
    let tableBody = document.querySelector("#dynamicTable tbody");
    tableBody.innerHTML = ""; // Clear any existing rows

    responseData.forEach(function (data) {
        let row = document.createElement("tr");
        let loadDateEdit = document.createElement('input');
        loadDateEdit.setAttribute('class', 'loadDateEdit');
        loadDateEdit.setAttribute('type', 'date');

        let loadTimeEdit = document.createElement('input');
        loadTimeEdit.setAttribute('class', 'loadTimeEdit');
        loadTimeEdit.setAttribute('type', 'text');

        let productEdit = document.createElement('select');
        productEdit.setAttribute('class', 'productEdit');
        let productArray = data.product_array.split(',');

        for(let i = 0; i < productArray.length; i++){
            let productOption = document.createElement('option');
            productOption.innerHTML = productArray[i];
            productOption.value = productArray[i];
            productEdit.appendChild(productOption);
        }

        let quantityEdit = document.createElement('input');
        quantityEdit.setAttribute('class', 'quantityEdit');
        quantityEdit.setAttribute('type', 'text');

        let quantityEditType = document.createElement('select');
        quantityEditType.setAttribute('class', 'quantityEditType');
        const fullLoadOption = document.createElement('option');
        fullLoadOption.innerHTML = 'FULL LOAD';
        fullLoadOption.value = 'FULL LOAD';
        const gallonsOption = document.createElement('option');
        gallonsOption.innerHTML = 'GAL';
        gallonsOption.value = 'GAL';
        const tonsOption = document.createElement('option');
        tonsOption.innerHTML = 'TON';
        tonsOption.value = 'TON';

        quantityEditType.appendChild(fullLoadOption);
        quantityEditType.appendChild(gallonsOption);
        quantityEditType.appendChild(tonsOption);

        let billTo = document.createElement('select');
        billTo.setAttribute('class', 'billToEdit');
        const billToCECOption = document.createElement('option');
        billToCECOption.innerHTML = 'CECHIRE';
        billToCECOption.value = 'CECHIRE';
        const billToCPUOption = document.createElement('option');
        billToCPUOption.innerHTML = 'CUSTPU';
        billToCPUOption.value = 'CUSTPU';

        billTo.appendChild(billToCECOption);
        billTo.appendChild(billToCPUOption);

        let deleteTD = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><style>svg{fill:#000000}</style><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"/></svg>';
        // ^ LOL all this just for a trash can icon ^

        let delDateEdit = document.createElement('input');
        delDateEdit.setAttribute('class', 'delDateEdit');
        delDateEdit.setAttribute('type', 'date');
        let delTimeEdit = document.createElement('input');
        delTimeEdit.setAttribute('class', 'delTimeEdit');
        delTimeEdit.setAttribute('type', 'text');


        // Loop through each property in the data object and create table cells
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                let cell = document.createElement("td");
                if (key === 'convertedDelDate') {
                    if(data[key] !== null){
                        delDateEdit.setAttribute('value', data[key]);
                        delDateEdit.setAttribute('readonly', true);
                    }
                    cell.appendChild(delDateEdit);
                }
                else if (key === 'delTimeFormatted'){
                    if(data[key] !== null){
                        delTimeEdit.setAttribute('value', data[key]);
                    }
                    cell.appendChild(delTimeEdit);
                }
                else if (key === 'convertedLoadDate'){
                    if(data[key] !== null){
                        loadDateEdit.setAttribute('value', data[key]);
                    }
                    cell.appendChild(loadDateEdit);
                }
                else if (key === 'loadTimeFormatted'){
                    if(data[key] !== null){
                        loadTimeEdit.setAttribute('value', data[key]);
                    }
                    cell.appendChild(loadTimeEdit);
                }
                else if (key === 'ID'){
                    cell.className = 'id';
                    cell.textContent = data[key];
                    deleteButton.setAttribute('data-id', data[key]);
                }
                else if (key === 'display'){
                    if(data[key]){
                        cell.textContent = 'Active';
                    }
                    else{
                        cell.textContent = 'Complete';
                    }
                }
                else if (key === 'timestamp'){
                    cell.textContent = data[key];
                }
                else if(key === 'product'){
                    cell.appendChild(productEdit);
                    for (let i = 0; i < productEdit.options.length; i++){
                        if (productEdit.options[i].value === data[key]){
                            productEdit.options[i].selected = true;
                            break;
                        };
                    }
                }
                else if(key === 'quantity'){
                    const quantityExtracted = extractNumberAndText(data[key]);
                    quantityEdit.setAttribute('value', quantityExtracted.number);
                    cell.appendChild(quantityEdit);
                    cell.appendChild(quantityEditType);
                    for (let i = 0; i < quantityEditType.options.length; i++){
                        if (quantityEditType.options[i].value === quantityExtracted.text){
                            quantityEditType.options[i].selected = true;
                            break;
                        };
                    }
                }
                else if(key === 'bill_to'){
                    cell.appendChild(billTo);
                    for (let i = 0; i < billTo.options.length; i++){
                        if (billTo.options[i].value === data[key]){
                            billTo.options[i].selected = true;
                            break;
                        };
                    }
                }
                else if(key === 'product_array'){
                    continue;
                }
                else {
                    cell.textContent = data[key];
                }
                row.appendChild(cell);

            }
        }
        deleteTD.appendChild(deleteButton);
        row.appendChild(deleteTD);
        tableBody.appendChild(row);

        flatpickr(".loadTimeEdit", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            minuteIncrement: 30,
        });

        flatpickr(".delTimeEdit", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            minuteIncrement: 30,
        });

        deleteButton.addEventListener('click', async (event) => {
            event.preventDefault();

            const number = deleteButton.getAttribute("data-id");
            let payload;

            if(confirm(`Are you sure you want to delete load with ID ${number}?`) == true){
                const username = `${localStorage.getItem('username')}`;
                payload = {
                    number,
                    username,
                };
            
                try {
                    const response = await fetch('/delete-schedule', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });
            
                    if (!response.ok) {
                        throw new Error('Failed to fetch data from server.');
                    }
                    
                    row.remove();
                    
                } catch (error) {
                        console.error('Uh oh!', error);
                }
            }
        });
    });
}

document.getElementById('submit_button').addEventListener('click', async (event) => {
    event.preventDefault();
    //tries to remove previous data submit message
    if (document.getElementById('responseTextLookup')){
        document.getElementById('responseTextLookup').remove();
    }
    //tries to remove previous error message
    if (document.getElementById('invalidLift')){
        document.getElementById('invalidLift').remove();
    }
    // tries to remove previous form
    if (document.getElementById('gridReport')) {
      document.getElementById('gridReport').remove();
    }
  
    // defines containers and number
    const number = document.getElementById('unique_id').value;
    const date = document.getElementById('date_time_query').value;
    const delDate = document.getElementById('del_date_time_query').value;
    const originCompany = document.getElementById('origin_company_query').value;
    let sched_form = document.createElement('form'); // Start here to create a grid sheet of the returned data
    sched_form.setAttribute('id', 'gridReport'); // Here too <<<<
    let container = document.getElementById('resultContainer');
  
    // retrieves information from our server

    const payload = {
        number,
        date,
        delDate,
        originCompany,
    };

    try {
        const response = await fetch('/read-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from server.');
        }

        const responseData = await response.json();

        if (responseData.result.length === 0) {
            const tableArray = document.querySelectorAll('td');
            tableArray.forEach(function (cell) {
                cell.textContent = '';
            });
            const invalidLiftNumber = document.createElement('span');
            invalidLiftNumber.id = 'invalidLift';
            invalidLiftNumber.innerHTML = 'No Results!';
            container.appendChild(invalidLiftNumber);
        }
        else {
            if(!document.getElementById('dynamicTable')){
                createTable();
                populateTable(responseData.result);
            }
            else{
                populateTable(responseData.result);
            }
        }
    } catch (error) {
            console.error('Uh oh!', error);
    }
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