// ------------------------VARIABLE DECLARATIONS-----------------------------

const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const corsOptions = 'http://extloads.coastal-fmc.com';
const app = express();

const port = 3030;

const secretKey = 'Co@stal362';

const publicDir = path.join(__dirname, '..', 'protected', 'public');

let pool;

//Our Local Database config for inputting data
const localConfig = {
    server: 'SQL-2019.cfmc.local',
    authentication: {
        type: 'default',
        options: {
            userName: 'nodejs',
            password: 'Co@stal362',
        },
    },
    options: {
        database: 'External_load_scheduling',
        encrypt: false,
    },
};

//Our External Database config for reading data
const extConfig = {
    server: 'DEARMAN-TUL',
    authentication: {
        type: 'default',
        options: {
            userName: 'nodejs',
            password: 'Co@stal362',
        },
    },
    options: {
        database: 'Tulsa',
        encrypt: false,
    },
};

// ------------------------FUNCTIONS---------------------------------

async function databaseQuery(query, databaseConfig) {
    try {
        while (isSqlConnected()){
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        pool = await sql.connect(databaseConfig);
        
        const request = pool.request();

        const result = await request.query(query);

        const rows = result.recordset;

        sql.close();

        return rows;
    } catch (error) {
        throw new Error('Error executing the database query: ' + error.message);
    }
}

// for checking to see if there's an active sql connection that we need to wait for
function isSqlConnected() {
    return pool && pool.connected;
}

function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}

function formatTime(timeIn){
    const [hours, minutes] = timeIn.split(':').map(part => parseInt(part, 10));
    const timeOut = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.0000000`;

    return timeOut;
}

function generateToken(userId, storedPermission) {
    return jwt.sign({ userId, storedPermission }, secretKey, { expiresIn: '9h' });
}

function hashPassword(username, plainTextPassword, permission){
    bcrypt.hash(plainTextPassword, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing the password:', err);
        }
        else {
            databaseQuery(`INSERT INTO UserAuthentication (username, password, permission) VALUES ('${username}', '${hashedPassword}', '${permission}');`, localConfig);
        }
    });
}

async function checkExistingUser(username){
    query = `SELECT * FROM dbo.UserAuthentication WHERE username = '${username}';`;
    const result = await databaseQuery(query, localConfig);
    if(result.length < 1){
        return false;
    }else{
        return true;
    }
}

// ----------------------MAIN CODE-----------------------------

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors(corsOptions));

// Route to handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    //const user = users.find((u) => u.username === username);
  
    /* if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    } */
    let storedPassword;
    if(await checkExistingUser(username)){
        try{
            const passwordQuery = `SELECT password, permission FROM dbo.UserAuthentication WHERE username = '${username}';`;
            const result = await databaseQuery(passwordQuery, localConfig);
            storedPassword = result[0].password;
            storedID = result[0].ID;
            storedPermission = result[0].permission;
        }catch(error){
            console.error('Error executing the database query: ', error);
            res.status(500).json({ error: 'Internal server error'});
        }
        
        bcrypt.compare(password, storedPassword, (err, isPasswordValid) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
    
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }
    
            const token = generateToken(storedID, storedPermission);
            res.json({ token });
        });
    }
    else{
        return res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Protected route example (requires authentication)
app.get('/scheduler', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'reports-viewer.html');    
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'lookup-plant.html');
        }
        else if(decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'scheduler-dispatch.html');
        }
        else if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'scheduler.html');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/schedulerScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'scripts', 'lookup-plant.js');
        }
        else if(decoded.storedPermission === 'Administrator' || decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'scripts', 'scheduler.js');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }


        // The user is authenticated; you can handle the protected route logic here.
        
        res.sendFile(protectedPagePath);
    });
});

app.get('/lookup', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'reports-viewer.html');    
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'lookup-plant.html');
        }
        else if(decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'lookup-dispatch.html');
        }
        else if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'lookup.html');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/lookupScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'scripts', 'lookup-plant.js');
        }
        else if(decoded.storedPermission === 'Administrator' || decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'scripts', 'lookup.js');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);

    });
});

app.get('/reports', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'reports.html');
        }
        else if(decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'reports-dispatch.html');
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'reports-plant.html');
        }
        else if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'reports-viewer.html');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/reportsScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // The user is authenticated; you can handle the protected route logic here.
        const protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        res.sendFile(protectedPagePath);
    });
});

app.get('/administration', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'admin.html');
        }
        else{
            protectedPagePath = path.join(publicDir, 'reports.html');
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/administrationScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'scripts', 'admin.js');
        }
        else{
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }

        res.sendFile(protectedPagePath);
    });
});

// Get form data and use it to READ or INPUT to database
app.post('/submit-read-form', async (req,res) => {
    try {
        const { number } = req.body;
        const query = `SELECT c.ConRef, p.ProdName, t.TpName, d.DestCity, d.DestState, cr.CarName1, cu.Custname
        FROM DSI_REG_Contract c 
            LEFT JOIN APM_ProdAllocation pa ON c.ConTermKey = pa.PAlcTerminal
            LEFT JOIN APM_Products p ON pa.PAlcProdKey = p.ProdEntityKey
            LEFT JOIN APM_CUSTOMER cu ON c.ConCustomerKey = cu.CustEntityKey
            LEFT JOIN APM_Terminal t ON pa.PAlcTerminal = t.TpEntityKey
            LEFT JOIN DSI_REG_ContractDestinations ao ON c.ConEntityKey = ao.ConDestContractKey
            LEFT JOIN APM_DESTINATION d ON ao.ConDestDestinationKey = d.DestEntityKey
            LEFT JOIN APM_CARRIERCUSTOMERS cc ON cc.CarCustCustKey = c.ConCustomerKey
            LEFT JOIN APM_CARRIER cr ON cc.CarCustCarKey = cr.CarEntityKey
        WHERE ConRef = '${number}'
            AND (ao.ConDestDelFlg IS NULL OR ao.ConDestDelFlg = 0)
            AND NOT cr.CarName1 = 'FMC Transport'
            AND DATEDIFF(Day, GETDATE(), c.ConStartDate) <= 5
            AND DATEDIFF(Day, c.ConEndDate, GETDATE()) <= 5;`;
        const result = await databaseQuery(query, extConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }

});

app.post('/submit-input-form', async (req,res) => {
    try {
        const { liftNumber, loadDateInput, loadTimeInput, delDateInput, delTimeInput, productInput, quantityInput, originInput, carInput, custInput, billToInput, destCityInput, destStateInput } = req.body;
        let insertQuery = `
            INSERT INTO dbo.Main (lift_num, load_date, load_time, del_date, del_time, product, quantity, origin, cust_name, bill_to, carrier, destination_city, destination_state)
            VALUES ('${liftNumber}', '${loadDateInput}',`;
        if(!loadTimeInput){
            insertQuery += `${loadTimeInput}, `;
        }
        else{
            insertQuery += `'${loadTimeInput}', `;
        }

        insertQuery += `'${delDateInput}',`;

        if(!delTimeInput){
            insertQuery += `${delTimeInput}, `;
        }
        else{
            insertQuery += `'${delTimeInput}', `;
        }
        
        insertQuery += `'${productInput}', '${quantityInput}', '${originInput}', '${custInput}', '${billToInput}', '${carInput}', '${destCityInput}', '${destStateInput}');
            `;
        
        await databaseQuery(insertQuery, localConfig);

        res.status(200).send('Data inserted successfully.');
    } catch (error) {
        console.error('Error inserting data: ', error);
        res.status(500).send('Error inserting data');
    }
});

app.post('/read-report', async (req,res) => {
    try {
        const number = req.body.number;
        const date = formatDateTime(req.body.date);
        const delDate = formatDateTime(req.body.delDate);
        const query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin, cust_name, carrier, bill_to, destination_city, destination_state, timestamp
        FROM Main
        WHERE ID = '${number}' OR CONVERT(date, '${date}') = CONVERT(date, load_date) OR CONVERT(date, '${delDate}') = CONVERT(date, del_date)`;
        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };
        
        console.log(responseData);

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/read-reports-page', async (req, res) => {
    const { startDate, endDate } = req.body;

    try {
        const query = `
            SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin, cust_name, carrier, bill_to, destination_city, destination_state, timestamp
            FROM Main
            WHERE load_date BETWEEN '${startDate}' AND '${endDate}'`;
        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/update-record', async (req,res) => {
    try {

        var loadDateQuery = '';
        var delDateQuery = '';
        var loadTimeQuery = '';
        var delTimeQuery = '';
        var queryEnd = '';
        const receivedArray = req.body;
        
        for (i=0; i< receivedArray.length;i++){
            loadDateQuery += `WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].loadDate}'`;
            loadTimeQuery += `WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].loadTime}'`;
            delDateQuery += `WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].delDate}'`;
            delTimeQuery += `WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].delTime}'`;

            if(i+1 == receivedArray.length){
                queryEnd += `'${receivedArray[i].id}'`;
            }
            else{
                queryEnd += `'${receivedArray[i].id}', `;
            }
        }

        const query = `
        UPDATE Main
        SET load_date = 
            CASE ID
                ${loadDateQuery}
            END,
        load_time = 
            CASE ID
                ${loadTimeQuery}
            END,
        del_time = 
            CASE ID
                ${loadTimeQuery}
            END,
        del_date =
            CASE ID
                ${delDateQuery}
            END
        WHERE ID IN (${queryEnd});
        `;

        const response = databaseQuery(query, localConfig);

        res.json(response);
    } catch (error) {
        console.error('Error updating record: ', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/delete-schedule', async (req,res) => {
    const id = req.body.number;

    const query = `DELETE FROM Main WHERE ID = '${id}';`;

    try{
        await databaseQuery(query, localConfig);
        res.status(200).send('Deleted the record');
    }
    catch (error){
        console.error('Error deleting data: ', error);
        res.status(500).send('Could not delete record');
    }
});

app.post('/adminCreateUser', async (req,res) => {
    try {
        const { username, password, permission } = req.body;
        if(!(await checkExistingUser(username))){
            hashPassword(username, password, permission)

            res.status(200).send('User inserted successfully.');
        }
        else{
            res.status(200).send('exists');
        }
        
    } catch (error) {
        console.error('Error inserting data: ', error);
        res.status(500).send('Error inserting data');
    }
});


app.post('/adminListUsers', async (req, res) => {
    try {
        const query = `SELECT [username], [permission]
        FROM dbo.UserAuthentication`;
        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/adminListEditUser', async (req, res) => {
    const user = req.body.user
    
    try {
        const query = `
            SELECT [username], [permission]
            FROM dbo.UserAuthentication WHERE username = '${user}';`;
        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/adminEditUser', async (req, res) => {
    const { username, newUsername, newPermission, newPassword } = req.body;
    let query;

    if(!(await checkExistingUser(newUsername))){
        if(newPassword === ''){
            query = `
                UPDATE UserAuthentication
                SET permission = 
                    CASE username
                        WHEN '${username}' THEN '${newPermission}'
                    END,
                username =
                    CASE username
                        WHEN '${username}' THEN '${newUsername}'
                    END
                WHERE username IN ('${username}');`;
    
            const response = await databaseQuery(query, localConfig);
    
            res.json(response);
        }
        else{
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing the password:', err);
                }
                else {
                    databaseQuery(`
                        UPDATE UserAuthentication
                        SET permission = 
                            CASE username
                                WHEN '${username}' THEN '${newPermission}'
                            END,
                        password =
                            CASE username
                                WHEN '${username}' THEN '${hashedPassword}'
                            END,
                        username =
                            CASE username
                                WHEN '${username}' THEN '${newUsername}'
                            END
                        WHERE username IN ('${username}');`, localConfig);
                }
            });
    
            res.status(200).send('Record updated successfully');
        }
    }
    else{
        res.status(200).send('exists');
    }

    

});

app.post('/adminDeleteUser', async (req, res) => {
    

    const username = req.body.username;

    databaseQuery(`DELETE FROM UserAuthentication WHERE username = '${username}'`, localConfig);

    res.status(200).send('User deleted');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
