function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}

// Function to dynamically create the table
function createTable() {
    var tableContainer = document.getElementById("resultContainer");
    var table = document.createElement("table");
    table.id = "dynamicTable";
    var thead = document.createElement("thead");
    var tbody = document.createElement("tbody");

    var headerRow = document.createElement("tr");
    var headers = [
        "ID", "Lift #", "Load Date/Time", "Delivery Date/Time", "Product", "Qty", "Origin", "Customer Name", "Carrier", "Bill To", "Dest. City", "Dest. State", "Timestamp"
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
            const loadDateTime = formatDateTime(row.querySelector('#loadDateTimeEdit').value);
            const delDateTime = formatDateTime(row.querySelector('#delDateTimeEdit').value);
    
            const payload = {
                id,
                loadDateTime,
                delDateTime
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
        var loadDateTimeEdit = document.createElement('input');
        loadDateTimeEdit.setAttribute('id', 'loadDateTimeEdit');
        loadDateTimeEdit.setAttribute('type', 'datetime-local');
    
        var delDateTimeEdit = document.createElement('input');
        delDateTimeEdit.setAttribute('id', 'delDateTimeEdit');
        delDateTimeEdit.setAttribute('type', 'datetime-local');

        // Loop through each property in the data object and create table cells
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var cell = document.createElement("td");
                if (key === 'del_date_time') {
                    if(data[key] !== null){
                        delDateTimeEdit.setAttribute('value', formatDateTime(data[key]));
                        delDateTimeEdit.setAttribute('readonly', true);
                    }
                    cell.appendChild(delDateTimeEdit);
                }
                else if (key === 'ID'){
                    cell.id = 'id';
                    cell.textContent = data[key];
                }
                else if (key === 'load_date_time'){
                    if(data[key] !== null){
                        loadDateTimeEdit.setAttribute('value', formatDateTime(data[key]));
                    }
                    cell.appendChild(loadDateTimeEdit);
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
        tableBody.appendChild(row);
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
    const dateTime = document.getElementById('date_time_query').value;
    const delDateTime = document.getElementById('del_date_time_query').value;
    var sched_form = document.createElement('form'); // Start here to create a grid sheet of the returned data
    sched_form.setAttribute('id', 'gridReport'); // Here too <<<<
    var container = document.getElementById('resultContainer');
  
    // retrieves information from our server

    const payload = {
        number,
        dateTime,
        delDateTime
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