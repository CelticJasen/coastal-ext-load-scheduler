//const express = require('express');
const sql = require('mssql');

const config = {
    
    server: 'SQL-2019.cfmc.local',
    authentication: {
        type: 'default',
        options: {
            userName: 'Tester',
            password: 'America1',
        },
    },
    options: {
        database: 'External_load_scheduling',
        encrypt: false,
    },
};

sql.connect(config)
.then((pool) => {
    const tableName = 'Main';
    const columns = ['lift_num', 'sched_date', 'sched_time', 'product', 'origin', 'cust_name', 'carrier', 'destination']

    const data = {
        lift_num: '1234',
        sched_date: '2023-07-10',
        sched_time: '12:00:00',
        product: 'apples',
        origin: 'Willow',
        cust_name: 'Gary',
        carrier: 'Gary-Transport',
        destination: 'Houston, TX'
    };

    const placeholders = columns.map(column => `@${column}`).join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const request = new sql.Request(pool);

    columns.forEach(column => {
        request.input(column, sql.VarChar, data[column]);
    });

    request.query(query)
    .then(() => {
        console.log('Data inserted successfully');
        sql.close();
    })
    .catch((err) => {
        console.error('Error inserting data:', err);
        sql.close();
    });
})

.catch((err) => {
    console.error('Error connecting to SQL Server:', err);
    sql.close();
});