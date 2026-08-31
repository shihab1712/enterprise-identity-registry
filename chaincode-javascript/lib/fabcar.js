/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

/*
 * Decentralized Enterprise Identity & Access Registry
 * -----------------------------------------------------
 * This chaincode replaces the original "car" logic with employee identity
 * records. Every record is stored under a unique key (e.g. EMP001) and holds:
 *   - employee_name
 *   - department        (HR, IT, Finance, ...)
 *   - role              (Developer, System Admin, Manager, ...)
 *   - clearance_status  (Active, Suspended, Revoked)
 *   - docType           (always 'identity' -- used by CouchDB rich queries)
 *
 * NOTE: the chaincode is still deployed under the name "fabcar" (see
 * startFabric.sh: -ccn fabcar), so the API layer keeps calling
 * network.getContract('fabcar'). Only the transaction functions changed.
 */
class FabCar extends Contract {

    // Seed the ledger with a few sample identities so the app has data to show.
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const identities = [
            { employee_name: 'Tomoko Sato',     department: 'HR',      role: 'Manager',      clearance_status: 'Active' },
            { employee_name: 'Brad Adams',      department: 'IT',      role: 'System Admin', clearance_status: 'Active' },
            { employee_name: 'Jin Soo Park',    department: 'Finance', role: 'Manager',      clearance_status: 'Suspended' },
            { employee_name: 'Max Weber',       department: 'IT',      role: 'Developer',    clearance_status: 'Active' },
            { employee_name: 'Adriana Costa',   department: 'Finance', role: 'Developer',    clearance_status: 'Revoked' },
            { employee_name: 'Michel Dubois',   department: 'HR',      role: 'System Admin', clearance_status: 'Active' },
        ];

        for (let i = 0; i < identities.length; i++) {
            identities[i].docType = 'identity';
            // Keys look like EMP001, EMP002, ...
            const id = 'EMP' + String(i + 1).padStart(3, '0');
            await ctx.stub.putState(id, Buffer.from(JSON.stringify(identities[i])));
            console.info('Added <--> ', id, identities[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    // CREATE : issue a new employee identity.
    async createIdentity(ctx, id, employeeName, department, role, clearanceStatus) {
        console.info('============= START : Create Identity ===========');

        const exists = await ctx.stub.getState(id);
        if (exists && exists.length !== 0) {
            throw new Error(`The identity ${id} already exists`);
        }

        const identity = {
            docType: 'identity',
            employee_name: employeeName,
            department,
            role,
            clearance_status: clearanceStatus,
        };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : Create Identity ===========');
    }

    // READ (single) : return one identity by its unique ID.
    async readIdentity(ctx, id) {
        const identityAsBytes = await ctx.stub.getState(id);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`${id} does not exist`);
        }
        console.log(identityAsBytes.toString());
        return identityAsBytes.toString();
    }

    // READ ALL : return every identity on the ledger.
    async queryAllIdentities(ctx) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    // UPDATE : change an employee's clearance status (Active / Suspended / Revoked).
    async updateClearanceStatus(ctx, id, newStatus) {
        console.info('============= START : updateClearanceStatus ===========');

        const identityAsBytes = await ctx.stub.getState(id);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`${id} does not exist`);
        }
        const identity = JSON.parse(identityAsBytes.toString());
        identity.clearance_status = newStatus;

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : updateClearanceStatus ===========');
    }

    // SEARCH by department -- CouchDB rich query.
    async queryByDepartment(ctx, department) {
        const queryString = {
            selector: {
                docType: 'identity',
                department: department,
            },
        };
        return await this._getQueryResult(ctx, JSON.stringify(queryString));
    }

    // SEARCH by clearance status -- CouchDB rich query.
    async queryByClearanceStatus(ctx, status) {
        const queryString = {
            selector: {
                docType: 'identity',
                clearance_status: status,
            },
        };
        return await this._getQueryResult(ctx, JSON.stringify(queryString));
    }

    // Helper : run a CouchDB (Mango) query string and collect the results
    // into the same { Key, Record } shape used by queryAllIdentities so the
    // API and frontend can treat every list response identically.
    async _getQueryResult(ctx, queryString) {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const allResults = [];
        for await (const { key, value } of resultsIterator) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        return JSON.stringify(allResults);
    }

}

module.exports = FabCar;
