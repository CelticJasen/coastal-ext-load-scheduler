/* Creates a div element containing a p and optional dropdown element and 
    takes an id, text for the p, and optional data to populate the dropdown */
function createFormDiv(id, labelText, uniqueDataArray) {
    const formDiv = document.createElement('div');
    formDiv.setAttribute('class', 'formDiv');
    formDiv.id = id;

    const label = document.createElement('p');
    label.innerHTML = labelText;
    formDiv.appendChild(label);

    if (uniqueDataArray) {
        addDropdown(uniqueDataArray, formDiv);
    }

    return formDiv;
}

// Create dropdown lists or input fields
function addDropdown(formData, div) {
    let data = formData.filter((elements) => {
        return elements !== null;
    });

    const dropdown = document.createElement('select');
    const placeholder = document.createElement('option');

    placeholder.text = 'Select an option';
    placeholder.setAttribute('disabled', true);
    placeholder.setAttribute('selected', true);
    placeholder.setAttribute('hidden', true);
    dropdown.setAttribute('class', 'formInput');
    //dropdown.setAttribute('required', true);

    if (data.length > 1) {
        dropdown.add(placeholder);
    }

    data.forEach((optionText) => {
        let option = document.createElement('option');
        option.text = optionText;
        dropdown.add(option);
    });

    div.appendChild(dropdown);
}

// Remove duplicates in arrays
function uniqueData(array) {
    let uniqueArray = [];

    for (let i = 0; i < array.length; i++) {
        if (uniqueArray.indexOf(array[i]) === -1) {
            uniqueArray.push(array[i]);
        }
    }

    return uniqueArray.sort();
}

function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}

document.getElementById('submit_button').addEventListener('click', async (event) => {
    event.preventDefault();
  
    // tries to remove previous form
    if (document.getElementById('schedule_form')) {
        document.getElementById('schedule_form').remove();
    }
  
    // defines containers and number
    const number = document.getElementById('number').value;
    var sched_form = document.createElement('form');
    sched_form.setAttribute('id', 'schedule_form');
    var container = document.getElementById('resultContainer');
  
    // Send lift number to backend and wait for a response then populate the page with a form full of corresponding data
    try {
        const response = await fetch('/submit-read-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from server.');
        }

        const responseData = await response.json();

        if (responseData.result.length === 0) {
            const invalidLiftNumber = document.createElement('span');
            invalidLiftNumber.setAttribute('id', 'schedule_form');
            invalidLiftNumber.innerHTML = 'Invalid Lift Number!';
            container.appendChild(invalidLiftNumber);
        }
        else {
            const data = responseData.result;

            const conRefs = data.map((row) => row.ConRef);
            const prodNames = data.map((row) => row.ProdName);
            const tpNames = data.map((row) => row.TpName);
            const destCities = data.map((row) => row.DestCity);
            const destStates = data.map((row) => row.DestState);
            const carNames = data.map((row) => row.CarName1);
            const custNames = data.map((row) => row.Custname);

            // creates input elements for the generated form
            const final_submit = document.createElement('INPUT');
            const loadDateTime = document.createElement('INPUT');
            const delDateTime = document.createElement('INPUT');

            final_submit.setAttribute('type', 'submit');
            final_submit.setAttribute('class', 'formInput');
            final_submit.setAttribute('id', 'formSubmit');
            final_submit.setAttribute('value', 'Submit');
            loadDateTime.setAttribute('type', 'datetime-local');
            loadDateTime.setAttribute('class', 'formInput');
            delDateTime.setAttribute('type', 'datetime-local');
            delDateTime.setAttribute('class', 'formInput');

            const countyInput = document.createElement('select');
            countyInput.setAttribute('class', 'formInput');

            // labels for input fields
            const labelNames = ['liftLabel', 'loadDateTimeLabel', 'delDateTimeLabel', 'prodLabel', 'originLabel', 'destLabel', 'stateLabel', 'countyLabel', 'carLabel', 'custLabel'];
            const labels = {};

            for (const labelName of labelNames) {
                labels[labelName] = document.createElement('p');
            }

            // adds input fields to the form
            sched_form.appendChild(createFormDiv('liftDiv', 'Lift Number:', uniqueData(conRefs)));

            const loadDateTimeDiv = createFormDiv('loadDateTimeDiv', 'Load Date & Time:');
            loadDateTimeDiv.appendChild(loadDateTime);
            sched_form.appendChild(loadDateTimeDiv);

            const delDateTimeDiv = createFormDiv('delDateTimeDiv', 'Delivery Date & Time:');
            delDateTimeDiv.appendChild(delDateTime);
            sched_form.appendChild(delDateTimeDiv);

            sched_form.appendChild(createFormDiv('prodDiv', '<span>*</span>Product:', uniqueData(prodNames)));
            sched_form.appendChild(createFormDiv('originDiv', '<span>*</span>Origin:', uniqueData(tpNames)));
            sched_form.appendChild(createFormDiv('cityDiv', '<span>*</span>City:', uniqueData(destCities)));
            sched_form.appendChild(createFormDiv('stateDiv', '<span>*</span>State:', uniqueData(destStates)));
            sched_form.appendChild(createFormDiv('countyDiv', 'County:', uniqueData(countyInput)));
            sched_form.appendChild(createFormDiv('carDiv', '<span>*</span>Carrier:', uniqueData(carNames)));
            sched_form.appendChild(createFormDiv('custDiv', '<span>*</span>Customer:', uniqueData(custNames)));

            sched_form.appendChild(final_submit);

            // adds form to the page
            container.appendChild(sched_form);

            // makes lift number read-only
            document.getElementsByClassName('formInput')[0].setAttribute('readonly', true);

            const theForm = document.getElementById('schedule_form');
            const children = theForm.querySelectorAll('.formInput');
            const inputNames = [
                'liftNumber',
                'loadDateTimeInput',
                'delDateTimeInput',
                'productInput',
                'originInput',
                'destCityInput',
                'destStateInput',
                'countyInput',
                'carInput',
                'custInput',
            ];

            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const inputName = inputNames[i];

                if(child.hasAttribute('id')){
                    continue;
                }

                child.setAttribute('name', inputName);
                child.setAttribute('id', inputName);
            }

            // scrolls to bottom of page on button click
            window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: 'smooth' });

            const submitButtonInput = document.getElementById('formSubmit');

            const asyncClickListener = async (event) => {
                event.preventDefault();

                if (document.getElementById('responseText')) {
                    document.getElementById('responseText').remove();
                }

                // get form inputs
                const liftNumber = conRefs[0];
                let loadDateTimeInput = formatDateTime(document.getElementById('loadDateTimeInput').value);
                if(loadDateTimeInput == ''){
                    loadDateTimeInput = null;
                }

                let delDateTimeInput = formatDateTime(document.getElementById('delDateTimeInput').value);
                if(delDateTimeInput == ''){
                    delDateTimeInput = null;
                }

                const productInput = document.getElementById('productInput').value;
                const originInput = document.getElementById('originInput').value;
                const destCityInput = document.getElementById('destCityInput').value;
                const destStateInput = document.getElementById('destStateInput').value;
                const carInput = document.getElementById('carInput').value;
                const custInput = document.getElementById('custInput').value;
                const resultContainer = document.getElementById('schedule_form');
                const responseText = document.createElement('h1');
                responseText.setAttribute('id', 'responseText');

                // Check if any required field is empty
                if([productInput, originInput, destCityInput, destStateInput, carInput, custInput].includes('Select an option') || [productInput, originInput, destCityInput, destStateInput, carInput, custInput].includes('')){
                    responseText.innerHTML = '<span>Please populate all required fields</span>';
                    resultContainer.appendChild(responseText);
                    throw new Error('Failed to enter data in required field/s.');
                }

                const payload = {
                    liftNumber,
                    loadDateTimeInput,
                    delDateTimeInput,
                    productInput,
                    originInput,
                    destCityInput,
                    destStateInput,
                    carInput,
                    custInput,
                };
            
                // Input information to our database
                try {
                    const response = await fetch('/submit-input-form', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });
                
                    if (response.ok) {
                        responseText.innerHTML = 'Data submitted successfully!';
                        resultContainer.appendChild(responseText);
                    } else {
                        responseText.innerHTML = '<span>Error submitting data! Data not entered!</span>';
                        resultContainer.appendChild(responseText);
                        throw new Error('Failed to fetch data from server.');
                    }
                } catch (error) {
                    console.error('An error occurred:', error);
                }
                submitButtonInput.remove();
            };

            submitButtonInput.addEventListener('click', asyncClickListener);
        }
    } catch (error) {
            console.error('Uh oh!', error);
    }
});

newLogoutButton();

document.getElementById('schedulerButton').addEventListener('click', function() {
    fetchProtectedRoute('Scheduler');
});
document.getElementById('lookupButton').addEventListener('click', function(){
    fetchProtectedRoute('Lookup');
});
document.getElementById('reportsButton').addEventListener('click', function(){
    fetchProtectedRoute('Reports');
});
document.getElementById('adminButton').addEventListener('click', function(){
    fetchProtectedRoute('Administration');
});
