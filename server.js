const express = require('express');
const dotenv = require('dotenv');
const cookieParser=require('cookie-parser');
const connectDB = require('./config/db');
const mongoSanitize=require('express-mongo-sanitize');
const helmet = require('helmet')
const {xss}=require('express-xss-sanitizer');
const rateLimit=require('express-rate-limit');
const hpp=require('hpp')
//const cors=require('cors');

//Load env vars
dotenv.config({path:'./config/config.env'});

const app=express();
app.set('query parser', 'extended');

//Body parser
app.use (express.json());

//Sanitize data กันไม่ใส่emailสุ่มพาสเวิด
app.use(mongoSanitize());
//Set security headers เพิ่มheaders
app.use(helmet()); 
//Prevent XSS attacks กันใส่script
app.use(xss());
//Rate Limiting ไม่ให้ส่งrequestเกินค่าmax
    const limiter=rateLimit({
    windowsMs:10*60*1000, //10 mins
    max: 3
});
app.use(limiter); 
//Prevent http param pollutions ลบค่าที่ซ้ำของ query parameter เพื่อไม่ให้attacker overrideค่า
app.use(hpp());
//Enable CORS เช่น frontend(localhost:3000) เรียกใช้ backend API (localhost:5000) ได้
//app.use(cors());

//Cookie parser
app.use (cookieParser());

//Connect to database
connectDB();

//Route files
const hospitals = require('./routes/hospitals');
const auth = require('./routes/auth');
const appointments = require('./routes/appointments');

//Mount routers
app.use('/api/v1/hospitals',hospitals);
app.use('/api/v1/auth',auth);
app.use('/api/v1/appointments', appointments);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

//Handle unhandled promise rejections
process.on('unhandledRejection', (err,promise)=>{
    console.log(`Error: ${err.message}`); 
    //Close server & exit process
    server.close(()=>process.exit(1));
});