const mongoose = require('mongoose');
const Restaurant = require('./Restaurant');

const ReservationSchema=new mongoose.Schema ({
    user:{
        type:mongoose.Schema.ObjectId,
        ref: 'User' ,
        required:true
    },
    restaurant:{
        type:mongoose.Schema.ObjectId,
        ref: 'Restaurant',
        required:true
    },
    reservationDate: { type: Date, required: true },
    tables: {
        type: Number,
        required: true,
        min: 1,
        max: 3
    }//,
    // createAt: {
    //     type: Date,
    //     default: Date.now
    // }
});

module.exports=mongoose.model('Reservation',ReservationSchema);

