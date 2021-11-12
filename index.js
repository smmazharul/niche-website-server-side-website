require("dotenv").config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const admin = require("firebase-admin");
const ObjectId =require('mongodb').ObjectId;
const app = express();
const port = process.env.PORT || 5000;


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
// const serviceAccount = require('./best-car-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// const e = require("express");
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qeyo8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//verify Token
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {
            
        }
    };
    next();
}




async function run() {
    try {
        await client.connect();
        console.log('database connected successfully');
        const database = client.db('best-car');
        const serviceCollactions = database.collection('carService')
        const orderCollactions = database.collection('order')
        const orderConfirms = database.collection('orderConfirms')
        const usersCollactions = database.collection('users')
        
        //get service
        app.get('/services', async(req,res)=>{
            const cursor= serviceCollactions.find({})
            const services= await cursor.toArray();
            res.send(services)
        })
        //DELETE SERVICE 
        app.delete('/services/:id', async(req,res)=>{
            console.log(req.params.id);
            const result =await serviceCollactions.deleteOne({_id: ObjectId(req.params.id)});
            res.send(result)
        });
        
  

       //POST service
       app.post ('/services', async(req,res)=>{
        console.log('hit the post')
        const service=req.body;
        console.log('hit the psot api',service);
        const result =await serviceCollactions.insertOne(service)
        res.send(result)
       })
        
        
        
        
     //get users ID verified admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollactions.findOne(query);
            let isAdmin = false;
            if (user?.role==="admin") {
                isAdmin= true
            }
            res.json({ admin: isAdmin });
     })   
        
        
        
    //post users ID
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollactions.insertOne(user);
            console.log(result);
            res.json(result);
        })
    // make admin user put
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester=req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollactions.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } }
                    const result = await usersCollactions.updateOne(filter, updateDoc)
                    res.json(result)
                }
            }
            else {
                res.status(403).json({message: 'You do not have access to make Admin'})
            }
           
        })

    // post Purchage Order
       app.post('/purchage',(req,res)=>{
        orderCollactions.insertOne(req.body).then((result)=>{
            res.send(result);
        });
           
       });
    
        
        
         // get my Purchage Order
         app.get('/purchage/', async(req,res)=>{
               const email = req.query.email;
               const query = { email: email }
               const cursor = orderCollactions.find(query);
               const purchage = await cursor.toArray();
               res.json(purchage)
         });
        
        
        
        
  
        //order Confirm post api
        app.post('/orderConfirms', async (req, res) => {
            const orderConfirm = req.body;
            const result = await orderConfirms.insertOne(orderConfirm)
            console.log(result);
            res.json(result)
        })

        // my purchages order confirms get
        app.get('/mypurchages', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = orderConfirms.find(query);
            const mypurchages = await cursor.toArray();
            res.json(mypurchages)
        })
        ///my purchages order confirms get all for admin
        app.get('/allmypurchages', async (req, res) => {
            const query = req.query;
            // const  = { email: email }
            const cursor = orderConfirms.find(query);
            const mypurchages = await cursor.toArray();
            res.json(mypurchages)
        })
        //my delete purchages order confirms get all for admin
        app.delete('/DeleteAllOrder/:id', async(req,res)=>{
            // console.log(req.params.id);
            const result =await orderConfirms.deleteOne({
                _id: ObjectId(req.params.id),
            
            });
            res.send(result)
        });
          

         //delete from my purchage order
            app.delete('/DeleteOrder/:id', async(req,res)=>{
                console.log(req.params.id);
                const result =await orderCollactions.deleteOne({
                    _id: ObjectId(req.params.id),
                
                });
                res.send(result)
            });
              
        
           
            //UPDATE confirm status of confirm orders
                    app.put('/allmypurchages/:id', async (req, res) => {
                      const id = req.params.id;
                      const query = { _id: ObjectId(id) }; 
                      const updateDoc = {
                          $set: {
                              status:"Comfirm",
                          },
                      };
                      const result = await orderConfirms.updateOne(query, updateDoc)
                      console.log('updating', id)
                      res.json(result)
                  })

        
        
        //UPDATE API
        app.put('/services/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedUser.titile,
                    name: updatedUser.description,
                    name: updatedUser.price,
                    name: updatedUser.img,
                    name: updatedUser.time,
                },
            };
            const result = await serviceCollactions.updateOne(filter, updateDoc, options)
            // console.log('updating', id)
            res.json(result)
        })
        
        
        
        
        

    }
    finally {
        // await client.close()
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('we are making now best car website')
})
app.listen(port, (req, res) => {
    console.log('Running to port',port);
})