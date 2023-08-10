function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}
function formatTime(timeIn){
    const [hours, minutes, seconds] = timeIn.split(':').map(part => parseInt(part, 10));
    const timeOut = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return timeOut;
}
/* function formatDate(dateIn){
    const date = new Date(dateIn);
    const dateOut = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return dateOut;
} */

function roundTimeToHalfHour(input) {
    const timeString = input.value;
    let [hours, minutes] = timeString.split(':').map(Number);
    if (hours < 10){
        hours = `0${hours}`;
    }
    console.log(hours);
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
    var tableContainer = document.getElementById('resultContainer');
    var table = document.createElement('table');
    table.id = 'dynamicTable';
    var thead = document.createElement('thead');
    var tbody = document.createElement('tbody');

    var headerRow = document.createElement('tr');
    var headers = [
        'ID', 'Lift #', 'Load Date', 'Load Time', 'Delivery Date', 'Delivery Time', 'Product', 'Qty', 'Origin', 'Customer Name', 'Carrier', 'Bill To', 'Dest. City', 'Dest. State', 'Timestamp'
    ];

    const tableDiv = document.createElement('div');
    tableDiv.id = 'tableDiv';

    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'buttonDiv';

    var saveChangesButton = document.createElement('INPUT');
    saveChangesButton.id = 'saveChangesButton';
    saveChangesButton.setAttribute('type', 'submit');
    saveChangesButton.setAttribute('value', 'Save Changes');

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
            const id = row.querySelector('#id').innerText;
            const loadDate = row.querySelector('#loadDateEdit').value;
            const delDate = row.querySelector('#delDateEdit').value;
            const loadTime = row.querySelector('#loadTimeEdit').value;
            const delTime = row.querySelector('#delTimeEdit').value;
    
    
            const payload = {
                id,
                loadDate,
                loadTime,
                delDate,
                delTime
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
    var tableBody = document.querySelector("#dynamicTable tbody");
    tableBody.innerHTML = ""; // Clear any existing rows

    responseData.forEach(function (data) {
        var row = document.createElement("tr");
        var loadDateEdit = document.createElement('input');
        loadDateEdit.setAttribute('id', 'loadDateEdit');
        loadDateEdit.setAttribute('type', 'date');
        var loadTimeEdit = document.createElement('input');
        loadTimeEdit.setAttribute('id', 'loadTimeEdit');
        loadTimeEdit.setAttribute('type', 'time');
        loadTimeEdit.setAttribute('onblur', 'roundTimeToHalfHour(this)')

        var delDateEdit = document.createElement('input');
        delDateEdit.setAttribute('id', 'delDateEdit');
        delDateEdit.setAttribute('type', 'date');
        var delTimeEdit = document.createElement('input');
        delTimeEdit.setAttribute('id', 'delTimeEdit');
        delTimeEdit.setAttribute('type', 'time');
        delTimeEdit.setAttribute('onblur', 'roundTimeToHalfHour(this)')


        // Loop through each property in the data object and create table cells
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var cell = document.createElement("td");
                if (key === 'convertedDelDate') {
                    if(data[key] !== null){
                        delDateEdit.setAttribute('value', data[key]);
                        console.log(data[key]);
                        delDateEdit.setAttribute('readonly', true);
                    }
                    cell.appendChild(delDateEdit);
                }
                else if (key === 'delTimeFormatted'){
                    if(data[key] !== null){
                        delTimeEdit.setAttribute('value', formatTime(data[key]));
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
                        loadTimeEdit.setAttribute('value', formatTime(data[key]));
                        console.log(data[key]);
                        console.log(formatTime(data[key]));
                    }
                    cell.appendChild(loadTimeEdit);
                }
                else if (key === 'ID'){
                    cell.id = 'id';
                    cell.textContent = data[key];
                }
                
                else if (key === 'timestamp'){
                    cell.textContent = formatDateTime(data[key]);
                }
                else {
                    cell.textContent = data[key];
                }
                row.appendChild(cell);

            }
        }
        
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
    var sched_form = document.createElement('form'); // Start here to create a grid sheet of the returned data
    sched_form.setAttribute('id', 'gridReport'); // Here too <<<<
    var container = document.getElementById('resultContainer');
  
    // retrieves information from our server

    const payload = {
        number,
        date,
        delDate
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
            invalidLiftNumber.innerHTML = 'Invalid Entry!';
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