/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * NOTE: filename kept as createCar.js (as listed in the project brief) but this
 * module now submits the createIdentity transaction.
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');


async function main(params) {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('appUser');
        if (!identity) {
            console.log('An identity for the user "appUser" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        // gathering payload data
        const key = params.key                        // e.g. EMP007
        const employeeName = params.employee_name
        const department = params.department
        const role = params.role
        const clearanceStatus = params.clearance_status

        // Submit the createIdentity transaction.
        // ('createIdentity', 'EMP007', 'John Doe', 'IT', 'Developer', 'Active')
        await contract.submitTransaction('createIdentity', `${key}`, `${employeeName}`, `${department}`, `${role}`, `${clearanceStatus}`);
        console.log('Create Identity transaction has been submitted');

        // Disconnect from the gateway.
        await gateway.disconnect();

    }
    catch (error) {
        console.error(`Failed to create transaction: ${error}`);
        process.exit(1);
    }
}

// main();
module.exports = { main }
