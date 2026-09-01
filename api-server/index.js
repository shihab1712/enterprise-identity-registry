/*
 * REST API server for the Enterprise Identity & Access Registry.
 * Bridges the browser frontend to the Fabric chaincode.
 */
const express = require('express')
const cors = require('cors')
const query = require('./query');
const createCar = require('./createCar')       // now creates identities
const changeOwner = require('./changeOwner')   // now updates clearance status
const bodyParser = require('body-parser')


const app = express()

// To control CROSS-ORIGIN-RESOURCE-SHARING ( CORS )
app.use(cors())
app.options('*', cors());

// To parse encoded data
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({   // to support URL-encoded bodies
    extended: true
}));


// READ ALL  ->  GET /get-identity
// SEARCH by ID        ->  GET /get-identity?key=EMP001
// SEARCH by department->  GET /get-identity?department=IT
// SEARCH by status    ->  GET /get-identity?status=Active
app.get('/get-identity', function (req, res) {
    query.main(req.query)
        .then(result => {
            const parsedData = JSON.parse(result)
            let identityList

            // Single-ID lookup returns one object -> wrap it into a list so the
            // frontend can always iterate the response the same way.
            if (req.query.key) {
                identityList = [
                    {
                        Key: req.query.key,
                        Record: {
                            ...parsedData
                        }
                    }
                ]
                res.send(identityList)
                return
            }

            // Read-all and department/status searches already return an array.
            identityList = parsedData
            res.send(identityList)
        })
        .catch(err => {
            console.error({ err })
            res.send('FAILED TO GET DATA!')
        })
})

// CREATE a new identity  ->  POST /create
app.post('/create', function (req, res) {
    createCar.main(req.body)
        .then(result => {
            res.send({ message: 'Identity created successfully' })
        })
        .catch(err => {
            console.error({ err })
            res.send('FAILED TO LOAD DATA!')
        })
})

// UPDATE clearance status  ->  POST /update
app.post('/update', function (req, res) {
    changeOwner.main(req.body)
        .then(result => {
            res.send({ message: 'Clearance status updated successfully' })
        })
        .catch(err => {
            console.error({ err })
            res.send('FAILED TO LOAD DATA!')
        })
})

app.listen(3000, () => console.log('Server is running at port 3000'))
