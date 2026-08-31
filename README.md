# Decentralized Enterprise Identity & Access Registry

An **Internal HR & Security Portal** built on **Hyperledger Fabric**. An authorized
enterprise administrator issues and manages employee identity rights on a tamper-proof
ledger, giving a permanent audit trail of access control.

Built by converting the FabCar sample application — the "car" domain is replaced with
employee identity records, and a CouchDB-backed search feature is added.

---

## Team

| Member | Layer owned | GitHub |
|--------|-------------|--------|
| _Name_ | Chaincode (smart contract) | @_handle_ |
| _Name_ | REST API (backend) | @_handle_ |
| _Name_ | Frontend (dashboard UI) | @_handle_ |
| _Name_ | Integration, CouchDB & QA | @_handle_ |

---

## System overview

Unlike a public blockchain, Fabric is a permissioned network for private enterprise use.
Here, a single trusted admin uses a web dashboard to register employees, view the
directory, update clearance on events like termination, and search the registry — all
backed by the immutable ledger and shared across the network's organizations (Org1/Org2).

## Architecture

```
  Browser (fabcar-client)  --HTTP-->  REST API (api-server)  --SDK-->  Chaincode (fabcar.js)
        UI / forms                    Express routes                   Fabric ledger + CouchDB
        <-----------------------------  JSON  <-----------------------------
```

Three layers, each owned by a team member:

1. **Chaincode** — `chaincode-javascript/lib/fabcar.js`. The smart contract that reads and
   writes identity records on the ledger.
2. **REST API** — `api-server/`. An Express server that exposes the chaincode to the
   browser and routes read/search requests.
3. **Frontend** — `fabcar-client/`. A dashboard for the admin, no build step (opened with
   Live Server).

## Data model

Each identity is stored under a unique key such as `EMP001`:

| Field | Description | Example |
|-------|-------------|---------|
| `employee_name` | Full name | John Doe |
| `department` | Business unit | HR, IT, Finance |
| `role` | Job function | Developer, System Admin, Manager |
| `clearance_status` | Access level | Active, Suspended, Revoked |
| `docType` | Record type for CouchDB queries | `identity` |

## Features

| Feature | How it works | Chaincode transaction |
|---------|--------------|-----------------------|
| **Create** | Register a new employee identity | `createIdentity` |
| **Read All** | List every registered identity | `queryAllIdentities` |
| **Update** | Change clearance (e.g. Active → Revoked on termination) | `updateClearanceStatus` |
| **Search by ID** | Look up one employee | `readIdentity` |
| **Search by Department** | CouchDB rich query | `queryByDepartment` |
| **Search by Clearance Status** | CouchDB rich query | `queryByClearanceStatus` |

## Tech stack

Hyperledger Fabric 2.5 (test-network, two orgs) · CouchDB state database ·
Node.js / Express · fabric-network SDK · vanilla HTML/CSS/JS frontend.

## Project structure

```
fabcar/
├── chaincode-javascript/
│   ├── lib/fabcar.js                 # identity smart contract
│   └── META-INF/statedb/couchdb/indexes/
│       ├── indexDepartment.json      # CouchDB index: docType + department
│       └── indexClearanceStatus.json # CouchDB index: docType + clearance_status
├── api-server/
│   ├── index.js                      # Express routes
│   ├── query.js                      # read all / by id / by department / by status
│   ├── createCar.js                  # submits createIdentity
│   ├── changeOwner.js                # submits updateClearanceStatus
│   ├── enrollAdmin.js  registerUser.js   # unchanged
├── fabcar-client/
│   ├── index.html                    # dashboard
│   └── styles.css
├── startFabric.sh   networkDown.sh
```

## Setup & run

Prerequisites: Docker, Docker Compose, Node.js 18, and `fabric-samples` installed (see
Lab 6 / the Fabcar lab). Place this project inside `fabric-samples/fabcar/`.

```bash
# from fabric-samples/fabcar/

# clean any previous run
./networkDown.sh
docker rm -f $(docker ps -aq) 2>/dev/null
docker volume rm $(docker volume ls -q) 2>/dev/null
rm -rf api-server/wallet/

# start network + deploy chaincode (initLedger seeds sample identities)
./startFabric.sh javascript

# start the backend
cd api-server
npm i
node enrollAdmin.js
node registerUser.js
npm start                     # http://localhost:3000
```

Open `fabcar-client/index.html` with the VS Code **Live Server** extension.

> Re-run `./startFabric.sh javascript` after any change to `fabcar.js` to redeploy the
> chaincode. The chaincode name stays `fabcar` (`-ccn fabcar`), so the API's
> `getContract('fabcar')` is unchanged.

## Search feature (CouchDB)

The network runs with `-s couchdb`, so `queryByDepartment` and `queryByClearanceStatus`
use CouchDB Mango selectors, e.g.:

```json
{ "selector": { "docType": "identity", "department": "IT" } }
```

The two index definitions under `META-INF/statedb/couchdb/indexes/` are deployed with the
chaincode so these queries are indexed rather than doing a full scan. Verify from
`test-network/` (after exporting Org1 env vars as in Lab 6):

```bash
peer chaincode query -C mychannel -n fabcar -c '{"Args":["queryByDepartment","IT"]}'
peer chaincode query -C mychannel -n fabcar -c '{"Args":["queryByClearanceStatus","Revoked"]}'
```

Inspect the raw data in CouchDB at http://localhost:5984/_utils (admin / adminpw),
database `mychannel_fabcar`.

## API reference

| Method | Endpoint | Body / query | Result |
|--------|----------|--------------|--------|
| GET | `/get-identity` | – | all identities |
| GET | `/get-identity?key=EMP001` | – | one identity |
| GET | `/get-identity?department=IT` | – | identities in a department |
| GET | `/get-identity?status=Active` | – | identities with a status |
| POST | `/create` | key, employee_name, department, role, clearance_status | create |
| POST | `/update` | key, clearance_status | update clearance |

## Demo / screenshots

_Add screenshots of: (1) the dashboard directory, (2) a create, (3) an update to Revoked,
(4) a department search, (5) CouchDB `mychannel_fabcar`, (6) Org2 seeing the same data._

## Team contributions

_Fill in per member — chaincode functions written, API routes, UI, testing, docs, etc._

## Notes

- Network config, `enrollAdmin.js`, and `registerUser.js` are used as-is per the brief.
- `createCar.js` / `changeOwner.js` keep their original filenames (as listed in the brief);
  only their contents were changed to submit the identity transactions.
