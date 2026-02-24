const mongoose = require('mongoose');
const Hospital = require('./Hospital');

const AppointmentSchema=new mongoose.Schema ({
    apptDate: {
        type: Date,
        required:true
    },
    user:{
        type:mongoose.Schema.ObjectId,
        ref: 'User' ,
        require:true
    },
    hospital:{
        type:mongoose.Schema.ObjectId,
        ref: 'Hospital',
        required:true
    },
    createAt: {
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('Appointment',AppointmentSchema);

